export type SyncStatus = "Synced" | "Pending" | "Uploading" | "Failed";

export type CategoryType =
  | "All"
  | "Favorites"
  | "Passport"
  | "Recipe"
  | "Electricity Bill"
  | "QR Code"
  | "Ticket & Travel"
  | "Receipt & Invoice"
  | "Chat & Message"
  | "Code & Dev"
  | "E-Commerce"
  | "Admission & Certificate"
  | "Financial"
  | "Notes & Ideas"
  | "Other";

export type ProcessingJobStatus =
  | "Queued"
  | "Preparing"
  | "Generating Thumbnail"
  | "OCR Processing"
  | "AI Analysis"
  | "Saving Metadata"
  | "Updating Search Index"
  | "Completed"
  | "Failed";

export interface ScreenshotItem {
  id: string;
  user_id?: string;
  userId?: string;
  image_uri?: string;
  imageUrl: string;
  thumbnail_uri?: string;
  thumbnailUri?: string;
  ocr_text?: string;
  fullText: string;
  ai_description?: string;
  summary: string;
  title: string;
  category: CategoryType;
  keyEntities: string[];
  keywords?: string[];
  tags: string[];
  textDensity?: "low" | "medium" | "high";
  keyMetrics?: string[];
  file_name?: string;
  fileName?: string;
  folder?: string;
  date_created?: string | number;
  createdAt: string;
  date_modified?: string | number;
  dateModified?: string | number;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  file_size?: number;
  fileSizeKB: number;
  favorite?: boolean;
  isFavorite?: boolean;
  is_screenshot?: boolean;
  isScreenshot?: boolean;
  indexed_at?: string;
  indexedAt: string;
  last_scanned?: string | number;
  lastScanned?: string | number;
  processing_status?: ProcessingJobStatus;
  processingStatus?: ProcessingJobStatus;
  processing_timestamp?: string;
  processingTimestamp?: string;
  syncStatus?: SyncStatus;
  syncError?: string;
  lastSyncedAt?: string;
}

export interface ProcessingJob {
  id: string;
  imageId: string;
  imageUri: string;
  fileName: string;
  folder?: string;
  status: ProcessingJobStatus;
  progressPercent: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  processingTimestamp?: string;
  thumbnailUri?: string;
  base64Data?: string;
  ocrText?: string;
  aiDescription?: string;
  tags?: string[];
  keywords?: string[];
  category?: CategoryType;
  title?: string;
}

export interface SearchResultMatch {
  id: string;
  score: number;
  matchReason: string;
  highlightSnippet?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  categoryFilter?: CategoryType;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
  plan: "Free" | "Pro" | "Enterprise";
  storageLimitMB: number;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  autoIndexNewScreenshots: boolean;
  ocrAccuracy: "fast" | "accurate";
  enableNotifications: boolean;
  compactGridView: boolean;
  syncEnabled?: boolean;
  uploadImagesToCloud?: boolean;
}

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  description?: string;
  timestamp: number;
}
