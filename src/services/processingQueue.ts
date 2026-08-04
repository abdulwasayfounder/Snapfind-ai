import {
  ProcessingJob,
  ProcessingJobStatus,
  ScreenshotItem,
  CategoryType,
} from "../types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  normalizeScreenshotItem,
  StorageManager,
} from "./storage";
import { extractTextServerOCR } from "./ocr";
import { analyzeScreenshotImage } from "./api";
import { searchEngine } from "./searchEngine";

const QUEUE_STORAGE_KEY = "snapfind_processing_queue_v1";
const MAX_RETRIES = 3;

export type QueueEventListener = (jobs: ProcessingJob[], activeJob: ProcessingJob | null) => void;

/**
 * Non-blocking yield helper to keep main thread and animations smooth
 */
function yieldToMainThread(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a lightweight scaled thumbnail (max 300px) from base64 or URI
 */
async function createScaledThumbnail(
  sourceUri: string,
  maxWidth: number = 320,
  maxHeight: number = 320
): Promise<string> {
  if (!sourceUri || typeof window === "undefined") return sourceUri || "";
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let width = img.width || 800;
        let height = img.height || 600;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
          return;
        }
      } catch (err) {
        console.warn("Thumbnail canvas generation warning:", err);
      }
      resolve(sourceUri);
    };
    img.onerror = () => resolve(sourceUri);
    img.src = sourceUri;
  });
}

/**
 * Background Processing Queue for OCR & AI Vision Analysis
 */
class ProcessingQueueService {
  private jobs: ProcessingJob[] = [];
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private listeners: Set<QueueEventListener> = new Set();
  private activeJob: ProcessingJob | null = null;

  constructor() {
    this.initAndRecover();
  }

  /**
   * Load queue state from storage and recover unfinished jobs
   */
  private initAndRecover(): void {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed: ProcessingJob[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Recover any job that was interrupted mid-execution
          this.jobs = parsed.map((job) => {
            if (
              job.status !== "Completed" &&
              job.status !== "Failed" &&
              job.status !== "Queued"
            ) {
              // Interrupted mid-process: reset to Queued for automatic retry/completion
              return {
                ...job,
                status: "Queued" as ProcessingJobStatus,
                progressPercent: 0,
                errorMessage: undefined,
              };
            }
            return job;
          });
        }
      }
    } catch (err) {
      console.warn("Failed to load queue from storage:", err);
      this.jobs = [];
    }

    // Auto start queue if pending items exist
    setTimeout(() => {
      this.processNextInQueue();
    }, 500);
  }

  /**
   * Save queue metadata to persistent storage (without holding massive binary blobs)
   */
  private persistQueue(): void {
    try {
      // Save lightweight job objects
      const lightweightJobs = this.jobs.map((job) => ({
        ...job,
        base64Data: undefined, // Strip large base64 data before saving queue state
      }));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(lightweightJobs));
    } catch (err) {
      console.warn("Queue storage save warning:", err);
    }
  }

  /**
   * Notify subscribers of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.jobs], this.activeJob ? { ...this.activeJob } : null);
      } catch (err) {
        console.error("Queue listener error:", err);
      }
    });
  }

  /**
   * Subscribe to queue events
   */
  public subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener([...this.jobs], this.activeJob ? { ...this.activeJob } : null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if image is duplicate (already queued or already completed in stored screenshots)
   */
  public isDuplicate(imageId: string, imageUri?: string): boolean {
    // Check if in current queue
    const existsInQueue = this.jobs.some(
      (job) =>
        job.imageId === imageId ||
        (imageUri && job.imageUri === imageUri && job.status !== "Failed")
    );
    if (existsInQueue) return true;

    // Check if completed in storage
    const stored = loadStoredScreenshots();
    const existsInStorage = stored.some(
      (s) =>
        (s.id === imageId || (imageUri && (s.imageUrl === imageUri || s.image_uri === imageUri))) &&
        s.processingStatus === "Completed"
    );
    return existsInStorage;
  }

  /**
   * Enqueue a single image processing job
   */
  public enqueue(candidate: {
    id: string;
    imageUri: string;
    fileName: string;
    folder?: string;
    base64Data?: string;
  }): ProcessingJob | null {
    if (this.isDuplicate(candidate.id, candidate.imageUri)) {
      console.log(`Skipping duplicate processing job: ${candidate.id}`);
      return null;
    }

    const newJob: ProcessingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      imageId: candidate.id,
      imageUri: candidate.imageUri,
      fileName: candidate.fileName || `image_${candidate.id}.png`,
      folder: candidate.folder || "Screenshots",
      status: "Queued",
      progressPercent: 0,
      attempts: 0,
      maxAttempts: MAX_RETRIES,
      queuedAt: new Date().toISOString(),
      base64Data: candidate.base64Data,
    };

    this.jobs.push(newJob);
    this.persistQueue();
    this.notifyListeners();

    // Trigger processing asynchronously
    this.processNextInQueue();
    return newJob;
  }

  /**
   * Enqueue batch of image candidates (skips duplicates)
   */
  public enqueueBatch(
    candidates: Array<{
      id: string;
      imageUri: string;
      fileName: string;
      folder?: string;
      base64Data?: string;
    }>
  ): ProcessingJob[] {
    const enqueued: ProcessingJob[] = [];
    for (const c of candidates) {
      const job = this.enqueue(c);
      if (job) enqueued.push(job);
    }
    return enqueued;
  }

  /**
   * Pause processing
   */
  public pauseQueue(): void {
    this.isPaused = true;
    this.notifyListeners();
  }

  /**
   * Resume processing
   */
  public resumeQueue(): void {
    this.isPaused = false;
    this.processNextInQueue();
  }

  /**
   * Cancel processing and clear queue
   */
  public clearQueue(): void {
    this.jobs = [];
    this.activeJob = null;
    this.isProcessing = false;
    this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Main Queue Executor — Process one job at a time (Sequential Concurrency = 1)
   */
  private async processNextInQueue(): Promise<void> {
    if (this.isProcessing || this.isPaused) return;

    const nextJobIndex = this.jobs.findIndex((j) => j.status === "Queued");
    if (nextJobIndex === -1) {
      this.isProcessing = false;
      this.activeJob = null;
      this.notifyListeners();
      return;
    }

    this.isProcessing = true;
    const job = this.jobs[nextJobIndex];
    this.activeJob = job;

    try {
      await this.executePipeline(job);
    } catch (err: any) {
      console.error(`Pipeline execution error for job ${job.id}:`, err);
      await this.handleJobFailure(job, err.message || "Pipeline execution failed");
    } finally {
      this.isProcessing = false;
      this.activeJob = null;
      this.persistQueue();
      this.notifyListeners();

      // Yield to main thread before starting next job to keep UI 60fps
      await yieldToMainThread(50);
      this.processNextInQueue();
    }
  }

  /**
   * Update job status and progress percent
   */
  private updateJobState(
    job: ProcessingJob,
    status: ProcessingJobStatus,
    progressPercent: number
  ): void {
    job.status = status;
    job.progressPercent = progressPercent;
    this.notifyListeners();
  }

  /**
   * Execute complete image processing pipeline step-by-step
   */
  private async executePipeline(job: ProcessingJob): Promise<void> {
    job.attempts += 1;
    job.startedAt = job.startedAt || new Date().toISOString();

    // Step 1: Preparing
    this.updateJobState(job, "Preparing", 10);
    await yieldToMainThread(10);

    let base64 = job.base64Data || job.imageUri;
    if (!base64 || !base64.startsWith("data:image")) {
      // If external or local path without base64, attempt to load or default to imageUri
      base64 = job.imageUri;
    }

    // Step 2: Generating Thumbnail
    this.updateJobState(job, "Generating Thumbnail", 25);
    await yieldToMainThread(10);

    const thumbnailUri = await createScaledThumbnail(base64, 300, 300);
    job.thumbnailUri = thumbnailUri;

    // Step 3: OCR Processing
    this.updateJobState(job, "OCR Processing", 45);
    await yieldToMainThread(10);

    let ocrText = "";
    if (base64 && base64.startsWith("data:image")) {
      const ocrRes = await extractTextServerOCR(base64, job.fileName);
      ocrText = ocrRes.text || "";
    }
    job.ocrText = ocrText;

    // Step 4: AI Analysis
    this.updateJobState(job, "AI Analysis", 70);
    await yieldToMainThread(10);

    let aiTitle = job.fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    let aiSummary = ocrText ? `Extracted text: ${ocrText.slice(0, 150)}...` : "Gallery Screenshot";
    let aiCategory: CategoryType = "Other";
    let aiTags: string[] = ["Gallery", "Screenshot"];
    let aiKeywords: string[] = [];

    if (base64 && base64.startsWith("data:image")) {
      const aiRes = await analyzeScreenshotImage(base64, job.fileName);
      if (aiRes.success && aiRes.analysis) {
        aiTitle = aiRes.analysis.title || aiTitle;
        aiSummary = aiRes.analysis.summary || aiSummary;
        aiCategory = (aiRes.analysis.category as CategoryType) || "Other";
        aiTags = Array.from(new Set([...aiTags, ...(aiRes.analysis.tags || [])]));
        aiKeywords = aiRes.analysis.keyEntities || [];
      }
    }

    job.title = aiTitle;
    job.aiDescription = aiSummary;
    job.category = aiCategory;
    job.tags = aiTags;
    job.keywords = aiKeywords;

    // Step 5: Saving Metadata
    this.updateJobState(job, "Saving Metadata", 85);
    await yieldToMainThread(10);

    const nowIso = new Date().toISOString();
    job.processingTimestamp = nowIso;

    const screenshots = loadStoredScreenshots();
    const existingIndex = screenshots.findIndex((s) => s.id === job.imageId);

    const updatedItem: ScreenshotItem = normalizeScreenshotItem({
      id: job.imageId,
      imageUrl: job.imageUri,
      image_uri: job.imageUri,
      thumbnailUri: job.thumbnailUri || job.imageUri,
      thumbnail_uri: job.thumbnailUri || job.imageUri,
      title: aiTitle,
      category: aiCategory,
      summary: aiSummary,
      ai_description: aiSummary,
      fullText: ocrText,
      ocr_text: ocrText,
      keyEntities: aiKeywords,
      keywords: aiKeywords,
      tags: aiTags,
      fileName: job.fileName,
      file_name: job.fileName,
      folder: job.folder || "Screenshots",
      createdAt: nowIso,
      date_created: nowIso,
      dateModified: nowIso,
      date_modified: nowIso,
      indexedAt: nowIso,
      indexed_at: nowIso,
      isScreenshot: true,
      is_screenshot: true,
      processingStatus: "Completed",
      processing_status: "Completed",
      processingTimestamp: nowIso,
      processing_timestamp: nowIso,
    });

    if (existingIndex >= 0) {
      screenshots[existingIndex] = updatedItem;
    } else {
      screenshots.unshift(updatedItem);
    }

    saveStoredScreenshots(screenshots);

    // Step 6: Updating Search Index
    this.updateJobState(job, "Updating Search Index", 95);
    searchEngine.updateItem(updatedItem);
    searchEngine.updateIndex(screenshots);
    await yieldToMainThread(10);

    // Finalize Step: Completed
    job.status = "Completed";
    job.progressPercent = 100;
    job.completedAt = nowIso;
    // Clear base64 from memory to stay lightweight
    job.base64Data = undefined;
  }

  /**
   * Handle failures with automatic retry logic (up to 3 attempts)
   */
  private async handleJobFailure(job: ProcessingJob, errorMsg: string): Promise<void> {
    if (job.attempts < job.maxAttempts) {
      console.warn(`Job ${job.id} failed (Attempt ${job.attempts}/${job.maxAttempts}). Re-queuing...`);
      job.status = "Queued";
      job.errorMessage = `Retry ${job.attempts}/${job.maxAttempts}: ${errorMsg}`;
      job.progressPercent = 0;
      await yieldToMainThread(500); // Backoff delay before retry
    } else {
      console.error(`Job ${job.id} permanently failed after ${job.attempts} attempts.`);
      job.status = "Failed";
      job.errorMessage = errorMsg;
      job.progressPercent = 100;
      job.base64Data = undefined; // Clear memory
    }
  }

  /**
   * Get all current jobs
   */
  public getAllJobs(): ProcessingJob[] {
    return [...this.jobs];
  }

  /**
   * Get job by ID
   */
  public getJob(jobId: string): ProcessingJob | undefined {
    return this.jobs.find((j) => j.id === jobId || j.imageId === jobId);
  }
}

export const processingQueue = new ProcessingQueueService();
