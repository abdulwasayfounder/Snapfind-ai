import { ScreenshotItem, SearchHistoryItem, AppSettings, UserProfile } from "../types";
import { INITIAL_SAMPLE_SCREENSHOTS } from "../data/sampleScreenshots";
import { StorageManager, storageProvider } from "./storage/StorageManager";
import { StorageProvider } from "./storage/types";
import { IndexedDBStorageProvider } from "./storage/IndexedDBStorageProvider";
import { SQLiteStorageProvider } from "./storage/SQLiteStorageProvider";
import { SyncEngine } from "./syncEngine";

export { StorageManager, storageProvider, IndexedDBStorageProvider, SQLiteStorageProvider, SyncEngine };
export type { StorageProvider };

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  autoIndexNewScreenshots: true,
  ocrAccuracy: "accurate",
  enableNotifications: true,
  compactGridView: false,
  syncEnabled: true,
  uploadImagesToCloud: false,
};

export const DEFAULT_USER: UserProfile = {
  id: "guest",
  name: "Sign In",
  email: "",
  avatarUrl: "",
  isLoggedIn: false,
  plan: "Free",
  storageLimitMB: 1000,
};

export function normalizeScreenshotItem(item: Partial<ScreenshotItem>): ScreenshotItem {
  const imageUrl = item.imageUrl || item.image_uri || "";
  const fullText = item.fullText || item.ocr_text || "";
  const summary = item.summary || item.ai_description || "";
  const isFavorite = item.isFavorite ?? item.favorite ?? false;
  const indexedAt = item.indexedAt || item.indexed_at || new Date().toISOString();
  const fileSizeKB = item.fileSizeKB ?? (item.file_size ? Math.round(item.file_size / 1024) : 0);

  const procStatus = item.processingStatus || item.processing_status || "Completed";
  const procTimestamp = item.processingTimestamp || item.processing_timestamp || indexedAt;
  const keywordsList = item.keywords || item.keyEntities || [];

  return {
    id: item.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: item.user_id || item.userId || "guest",
    userId: item.userId || item.user_id || "guest",
    image_uri: item.image_uri || imageUrl,
    imageUrl: imageUrl,
    thumbnail_uri: item.thumbnail_uri || item.thumbnailUri || imageUrl,
    thumbnailUri: item.thumbnailUri || item.thumbnail_uri || imageUrl,
    ocr_text: item.ocr_text || fullText,
    fullText: fullText,
    ai_description: item.ai_description || summary,
    summary: summary,
    title: item.title || "Screenshot",
    category: item.category || "Other",
    keyEntities: item.keyEntities || keywordsList,
    keywords: keywordsList,
    tags: item.tags || [],
    textDensity: item.textDensity || "medium",
    keyMetrics: item.keyMetrics || [],
    file_name: item.file_name || item.fileName || "screenshot.png",
    fileName: item.fileName || item.file_name || "screenshot.png",
    folder: item.folder || "Screenshots",
    date_created: item.date_created || item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt || String(item.date_created || new Date().toISOString()),
    date_modified: item.date_modified || item.dateModified || new Date().toISOString(),
    dateModified: item.dateModified || item.date_modified || new Date().toISOString(),
    width: item.width || item.dimensions?.width || 1080,
    height: item.height || item.dimensions?.height || 1920,
    dimensions: item.dimensions || { width: item.width || 1080, height: item.height || 1920 },
    file_size: item.file_size || fileSizeKB * 1024,
    fileSizeKB: fileSizeKB,
    favorite: isFavorite,
    isFavorite: isFavorite,
    is_screenshot: item.is_screenshot ?? item.isScreenshot ?? true,
    isScreenshot: item.isScreenshot ?? item.is_screenshot ?? true,
    indexed_at: item.indexed_at || indexedAt,
    indexedAt: indexedAt,
    last_scanned: item.last_scanned || item.lastScanned || new Date().toISOString(),
    lastScanned: item.lastScanned || item.last_scanned || new Date().toISOString(),
    processing_status: procStatus,
    processingStatus: procStatus,
    processing_timestamp: procTimestamp,
    processingTimestamp: procTimestamp,
    syncStatus: item.syncStatus || "Synced",
    syncError: item.syncError || undefined,
    lastSyncedAt: item.lastSyncedAt || undefined,
  };
}

// Global In-Memory Cache for 0ms Instant UI Renders while background async operations complete
let cachedScreenshots: ScreenshotItem[] | null = null;
let cachedSettings: AppSettings | null = null;
let cachedSearchHistory: SearchHistoryItem[] | null = null;
let cachedUserProfile: UserProfile | null = null;

export async function initializeStorage(): Promise<void> {
  await StorageManager.initialize();
  const provider = StorageManager.getProvider();

  cachedScreenshots = await provider.getAllScreenshots();
  if (!cachedScreenshots || cachedScreenshots.length === 0) {
    const samples = INITIAL_SAMPLE_SCREENSHOTS.map(normalizeScreenshotItem);
    if (provider.saveAllScreenshots) {
      await provider.saveAllScreenshots(samples);
    }
    cachedScreenshots = samples;
  }

  cachedSettings = await provider.loadSettings();
  if (provider.loadSearchHistory) {
    cachedSearchHistory = await provider.loadSearchHistory();
  }
  if (provider.loadUserProfile) {
    cachedUserProfile = await provider.loadUserProfile();
  }
}

export function loadStoredScreenshots(): ScreenshotItem[] {
  if (cachedScreenshots) return cachedScreenshots;
  
  // Synchronous fallback from localStorage if cache not initialized yet
  try {
    const raw = localStorage.getItem("snapfind_screenshots_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedScreenshots = parsed.map(normalizeScreenshotItem);
        return cachedScreenshots;
      }
    }
  } catch (err) {}

  cachedScreenshots = INITIAL_SAMPLE_SCREENSHOTS.map(normalizeScreenshotItem);
  return cachedScreenshots;
}

export function saveStoredScreenshots(items: ScreenshotItem[]): void {
  const normalized = items.map(normalizeScreenshotItem);
  cachedScreenshots = normalized;
  const provider = StorageManager.getProvider();
  if (provider.saveAllScreenshots) {
    provider.saveAllScreenshots(normalized).catch((err) => {
      console.warn("StorageProvider saveAllScreenshots error:", err);
    });
  } else {
    normalized.forEach((sc) => provider.saveScreenshot(sc));
  }
  SyncEngine.scheduleSync(3000);
}

export function loadSearchHistory(): SearchHistoryItem[] {
  if (cachedSearchHistory) return cachedSearchHistory;
  try {
    const raw = localStorage.getItem("snapfind_search_history_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedSearchHistory = parsed;
        return parsed;
      }
    }
  } catch {}
  cachedSearchHistory = [];
  return [];
}

export function saveSearchHistory(history: SearchHistoryItem[]): void {
  cachedSearchHistory = history.slice(0, 30);
  const provider = StorageManager.getProvider();
  if (provider.saveSearchHistory) {
    provider.saveSearchHistory(cachedSearchHistory).catch((err) => {
      console.warn("StorageProvider saveSearchHistory error:", err);
    });
  }
}

export function loadSettings(): AppSettings {
  if (cachedSettings) return cachedSettings;
  try {
    const raw = localStorage.getItem("snapfind_settings_v1");
    if (raw) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return cachedSettings;
    }
  } catch {}
  cachedSettings = DEFAULT_SETTINGS;
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  cachedSettings = settings;
  const provider = StorageManager.getProvider();
  provider.saveSettings(settings).catch((err) => {
    console.warn("StorageProvider saveSettings error:", err);
  });
}

export function loadUserProfile(): UserProfile {
  if (cachedUserProfile) return cachedUserProfile;
  try {
    const raw = localStorage.getItem("snapfind_user_v1");
    if (raw) {
      cachedUserProfile = { ...DEFAULT_USER, ...JSON.parse(raw) };
      return cachedUserProfile;
    }
  } catch {}
  cachedUserProfile = DEFAULT_USER;
  return DEFAULT_USER;
}

export function saveUserProfile(user: UserProfile): void {
  cachedUserProfile = user;
  const provider = StorageManager.getProvider();
  if (provider.saveUserProfile) {
    provider.saveUserProfile(user).catch((err) => {
      console.warn("StorageProvider saveUserProfile error:", err);
    });
  }
}
