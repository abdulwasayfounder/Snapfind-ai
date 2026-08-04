import { ScreenshotItem } from "../types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  normalizeScreenshotItem,
  StorageManager,
} from "./storage";
import { extractTextServerOCR } from "./ocr";
import { analyzeScreenshotImage } from "./api";
import { processingQueue } from "./processingQueue";
import { searchEngine } from "./searchEngine";

export type IndexingStep =
  | "Preparing..."
  | "Scanning..."
  | "OCR..."
  | "AI Analysis..."
  | "Saving..."
  | "Completed";

export interface CandidateImage {
  id: string;
  image_uri?: string;
  imageUrl?: string;
  file_name?: string;
  fileName?: string;
  folder?: string;
  date_modified?: string | number;
  dateModified?: string | number;
  file_size?: number;
  fileSizeKB?: number;
  base64Data?: string;
  file?: File;
  blob?: Blob;
}

export interface IndexingProgressEvent {
  step: IndexingStep;
  currentStepIndex: number;
  totalSteps: number;
  processedCount: number;
  totalCandidates: number;
  newCount: number;
  modifiedCount: number;
  skippedCount: number;
  currentItemName?: string;
  statusText: string;
  percent: number;
}

export interface IndexingResult {
  success: boolean;
  totalScanned: number;
  newIndexed: number;
  modifiedUpdated: number;
  skippedCount: number;
  lastScanTimestamp: string;
  items: ScreenshotItem[];
  error?: string;
}

const STORAGE_KEYS = {
  LAST_SCAN_TIMESTAMP: "snapfind_last_scan_timestamp",
  INDEXED_IMAGE_IDS: "snapfind_indexed_image_ids",
};

/**
 * Non-blocking yield helper to ensure UI thread stays responsive (60fps)
 */
function yieldToMainThread(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse date or timestamp into epoch milliseconds
 */
function parseTimestampMillis(input?: string | number): number {
  if (!input) return 0;
  if (typeof input === "number") return input;
  const parsed = new Date(input).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Incremental Gallery Indexing Engine
 */
class IncrementalIndexingEngine {
  private isScanning: boolean = false;
  private cancelRequested: boolean = false;

  private cachedLastScanTimestamp: string | null = null;
  private cachedIndexedIds: Set<string> | null = null;

  /**
   * Get the last scan timestamp ISO string or epoch ms
   */
  public getLastScanTimestamp(): string {
    if (this.cachedLastScanTimestamp) return this.cachedLastScanTimestamp;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SCAN_TIMESTAMP);
      if (stored) {
        this.cachedLastScanTimestamp = stored;
        return stored;
      }
    } catch {}
    return "1970-01-01T00:00:00.000Z";
  }

  /**
   * Set and save the updated scan timestamp
   */
  public setLastScanTimestamp(timestampIso: string): void {
    this.cachedLastScanTimestamp = timestampIso;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SCAN_TIMESTAMP, timestampIso);
    } catch {}
    const provider = StorageManager.getProvider();
    if (provider.setLastScanTimestamp) {
      provider.setLastScanTimestamp(timestampIso).catch(() => {});
    }
  }

  /**
   * Get set of all currently indexed image IDs
   */
  public getIndexedImageIds(): Set<string> {
    if (this.cachedIndexedIds) return this.cachedIndexedIds;
    const set = new Set<string>();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INDEXED_IMAGE_IDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => set.add(id));
        }
      }
    } catch {}
    const screenshots = loadStoredScreenshots();
    screenshots.forEach((s) => set.add(s.id));
    this.cachedIndexedIds = set;
    return set;
  }

  /**
   * Save indexed image IDs to persistent storage
   */
  private saveIndexedImageIds(idsSet: Set<string>): void {
    this.cachedIndexedIds = idsSet;
    try {
      localStorage.setItem(STORAGE_KEYS.INDEXED_IMAGE_IDS, JSON.stringify(Array.from(idsSet)));
    } catch (err) {
      console.warn("Error saving indexed image IDs:", err);
    }
    const provider = StorageManager.getProvider();
    if (provider.saveIndexedImageIds) {
      provider.saveIndexedImageIds(idsSet).catch(() => {});
    }
  }

  /**
   * Convert a File/Blob or image URL to base64
   */
  private async imageToBase64(candidate: CandidateImage): Promise<string> {
    if (candidate.base64Data) return candidate.base64Data;
    
    if (candidate.file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(candidate.file!);
      });
    }

    if (candidate.blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(candidate.blob!);
      });
    }

    const uri = candidate.imageUrl || candidate.image_uri;
    if (uri && uri.startsWith("data:image")) {
      return uri;
    }

    // Return empty if external URL or unsupported local path
    return uri || "";
  }

  /**
   * Request cancellation of ongoing scan
   */
  public cancelScan(): void {
    if (this.isScanning) {
      this.cancelRequested = true;
    }
  }

  /**
   * Run incremental scan over candidate gallery images
   */
  public async runIncrementalScan(
    candidates: CandidateImage[],
    onProgress?: (event: IndexingProgressEvent) => void
  ): Promise<IndexingResult> {
    if (this.isScanning) {
      return {
        success: false,
        totalScanned: 0,
        newIndexed: 0,
        modifiedUpdated: 0,
        skippedCount: 0,
        lastScanTimestamp: this.getLastScanTimestamp(),
        items: loadStoredScreenshots(),
        error: "Scan already in progress",
      };
    }

    this.isScanning = true;
    this.cancelRequested = false;

    const scanStartTimeIso = new Date().toISOString();
    const lastScanMs = parseTimestampMillis(this.getLastScanTimestamp());
    const indexedIds = this.getIndexedImageIds();

    const newCandidates: CandidateImage[] = [];
    const modifiedCandidates: CandidateImage[] = [];
    let skippedCount = 0;

    // STEP 1: Preparing...
    if (onProgress) {
      onProgress({
        step: "Preparing...",
        currentStepIndex: 1,
        totalSteps: 6,
        processedCount: 0,
        totalCandidates: candidates.length,
        newCount: 0,
        modifiedCount: 0,
        skippedCount: 0,
        statusText: "Analyzing gallery delta and checking timestamps...",
        percent: 5,
      });
    }
    await yieldToMainThread(10);

    // Incremental classification
    for (const item of candidates) {
      const isAlreadyIndexed = indexedIds.has(item.id);
      const itemModifiedMs = parseTimestampMillis(item.date_modified || item.dateModified);

      if (!isAlreadyIndexed) {
        newCandidates.push(item);
      } else if (itemModifiedMs > lastScanMs) {
        modifiedCandidates.push(item);
      } else {
        skippedCount++;
      }
    }

    const toProcess = [...newCandidates, ...modifiedCandidates];
    const totalToProcess = toProcess.length;

    if (totalToProcess === 0) {
      this.setLastScanTimestamp(scanStartTimeIso);
      this.isScanning = false;

      if (onProgress) {
        onProgress({
          step: "Completed",
          currentStepIndex: 6,
          totalSteps: 6,
          processedCount: candidates.length,
          totalCandidates: candidates.length,
          newCount: 0,
          modifiedCount: 0,
          skippedCount,
          statusText: "No new or modified images found in gallery.",
          percent: 100,
        });
      }

      return {
        success: true,
        totalScanned: candidates.length,
        newIndexed: 0,
        modifiedUpdated: 0,
        skippedCount,
        lastScanTimestamp: scanStartTimeIso,
        items: loadStoredScreenshots(),
      };
    }

    let processedCount = 0;
    let newlyIndexedCount = 0;
    let modifiedUpdatedCount = 0;
    const existingScreenshots = loadStoredScreenshots();
    const updatedScreenshotsMap = new Map<string, ScreenshotItem>();
    existingScreenshots.forEach((item) => updatedScreenshotsMap.set(item.id, item));

    for (let i = 0; i < totalToProcess; i++) {
      if (this.cancelRequested) {
        this.isScanning = false;
        return {
          success: false,
          totalScanned: processedCount,
          newIndexed: newlyIndexedCount,
          modifiedUpdated: modifiedUpdatedCount,
          skippedCount,
          lastScanTimestamp: this.getLastScanTimestamp(),
          items: Array.from(updatedScreenshotsMap.values()),
          error: "Scan cancelled by user",
        };
      }

      const candidate = toProcess[i];
      const fileName = candidate.file_name || candidate.fileName || candidate.file?.name || `image_${candidate.id}.png`;
      const isModified = modifiedCandidates.some((m) => m.id === candidate.id);

      // STEP 2: Scanning...
      const basePercent = Math.round(10 + (i / totalToProcess) * 80);
      if (onProgress) {
        onProgress({
          step: "Scanning...",
          currentStepIndex: 2,
          totalSteps: 6,
          processedCount: i,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount,
          modifiedCount: modifiedUpdatedCount,
          skippedCount,
          currentItemName: fileName,
          statusText: `Scanning file header and thumbnail: ${fileName}`,
          percent: basePercent,
        });
      }
      await yieldToMainThread(10);

      const base64Data = await this.imageToBase64(candidate);

      // STEP 3: OCR...
      if (onProgress) {
        onProgress({
          step: "OCR...",
          currentStepIndex: 3,
          totalSteps: 6,
          processedCount: i,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount,
          modifiedCount: modifiedUpdatedCount,
          skippedCount,
          currentItemName: fileName,
          statusText: `Extracting text via OCR: ${fileName}`,
          percent: basePercent + 2,
        });
      }
      await yieldToMainThread(10);

      let ocrText = "";
      if (base64Data) {
        const ocrRes = await extractTextServerOCR(base64Data, fileName);
        ocrText = ocrRes.text || "";
      }

      // STEP 4: AI Analysis...
      if (onProgress) {
        onProgress({
          step: "AI Analysis...",
          currentStepIndex: 4,
          totalSteps: 6,
          processedCount: i,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount,
          modifiedCount: modifiedUpdatedCount,
          skippedCount,
          currentItemName: fileName,
          statusText: `Generating title, tags and AI description: ${fileName}`,
          percent: basePercent + 4,
        });
      }
      await yieldToMainThread(10);

      let aiTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      let aiSummary = ocrText ? `Contains text: ${ocrText.slice(0, 120)}...` : "Gallery Screenshot";
      let aiCategory: any = "Other";
      let aiTags: string[] = ["Gallery", "Screenshot"];
      let aiEntities: string[] = [];

      if (base64Data) {
        const aiRes = await analyzeScreenshotImage(base64Data, fileName);
        if (aiRes.success && aiRes.analysis) {
          aiTitle = aiRes.analysis.title || aiTitle;
          aiSummary = aiRes.analysis.summary || aiSummary;
          aiCategory = aiRes.analysis.category || aiCategory;
          aiTags = Array.from(new Set([...aiTags, ...(aiRes.analysis.tags || [])]));
          aiEntities = aiRes.analysis.keyEntities || [];
        }
      }

      // STEP 5: Saving...
      if (onProgress) {
        onProgress({
          step: "Saving...",
          currentStepIndex: 5,
          totalSteps: 6,
          processedCount: i + 1,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount + (isModified ? 0 : 1),
          modifiedCount: modifiedUpdatedCount + (isModified ? 1 : 0),
          skippedCount,
          currentItemName: fileName,
          statusText: `Storing metadata into database index: ${fileName}`,
          percent: basePercent + 6,
        });
      }

      const imageUrl = candidate.imageUrl || candidate.image_uri || base64Data || "";
      const createdAtStr = candidate.date_modified
        ? new Date(candidate.date_modified).toISOString()
        : new Date().toISOString();

      const newItem = normalizeScreenshotItem({
        id: candidate.id,
        imageUrl,
        image_uri: imageUrl,
        thumbnailUri: imageUrl,
        thumbnail_uri: imageUrl,
        title: aiTitle,
        category: aiCategory,
        summary: aiSummary,
        ai_description: aiSummary,
        fullText: ocrText,
        ocr_text: ocrText,
        keyEntities: aiEntities,
        tags: aiTags,
        fileName,
        file_name: fileName,
        folder: candidate.folder || "Screenshots",
        createdAt: createdAtStr,
        date_created: createdAtStr,
        dateModified: createdAtStr,
        date_modified: createdAtStr,
        fileSizeKB: candidate.fileSizeKB || (candidate.file_size ? Math.round(candidate.file_size / 1024) : 150),
        file_size: candidate.file_size || 150 * 1024,
        indexedAt: scanStartTimeIso,
        indexed_at: scanStartTimeIso,
        isScreenshot: true,
        is_screenshot: true,
      });

      updatedScreenshotsMap.set(newItem.id, newItem);
      indexedIds.add(newItem.id);

      // Register with background processing queue so both engines remain synchronized
      if (!processingQueue.isDuplicate(newItem.id, newItem.imageUrl)) {
        processingQueue.enqueue({
          id: newItem.id,
          imageUri: newItem.imageUrl,
          fileName: newItem.fileName || fileName,
          folder: newItem.folder,
          base64Data: base64Data,
        });
      }

      if (isModified) {
        modifiedUpdatedCount++;
      } else {
        newlyIndexedCount++;
      }

      processedCount++;

      // Save chunk every 3 items to avoid losing progress
      if (processedCount % 3 === 0 || processedCount === totalToProcess) {
        const currentList = Array.from(updatedScreenshotsMap.values());
        saveStoredScreenshots(currentList);
        this.saveIndexedImageIds(indexedIds);
      }

      await yieldToMainThread(10);
    }

    // STEP 6: Completed
    this.setLastScanTimestamp(scanStartTimeIso);
    this.saveIndexedImageIds(indexedIds);
    this.isScanning = false;

    const finalList = Array.from(updatedScreenshotsMap.values());
    searchEngine.updateIndex(finalList);

    if (onProgress) {
      onProgress({
        step: "Completed",
        currentStepIndex: 6,
        totalSteps: 6,
        processedCount: totalToProcess,
        totalCandidates: candidates.length,
        newCount: newlyIndexedCount,
        modifiedCount: modifiedUpdatedCount,
        skippedCount,
        statusText: `Completed incremental index: ${newlyIndexedCount} new, ${modifiedUpdatedCount} modified, ${skippedCount} skipped.`,
        percent: 100,
      });
    }

    return {
      success: true,
      totalScanned: candidates.length,
      newIndexed: newlyIndexedCount,
      modifiedUpdated: modifiedUpdatedCount,
      skippedCount,
      lastScanTimestamp: scanStartTimeIso,
      items: finalList,
    };
  }
}

export const indexingEngine = new IncrementalIndexingEngine();
