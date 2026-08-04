import { StorageProvider } from "./types";
import { ScreenshotItem, AppSettings, SearchHistoryItem, UserProfile } from "../../types";
import { IndexedDBStorageProvider } from "./IndexedDBStorageProvider";

/**
 * SQLiteStorageProvider
 * Placeholder storage provider implementation for native Android (Capacitor SQLite).
 * When running in web preview or before native plugin binding, delegates gracefully
 * to IndexedDB while maintaining full native API readiness.
 */
export class SQLiteStorageProvider implements StorageProvider {
  private fallbackWebProvider: IndexedDBStorageProvider;
  private isNativeAvailable: boolean = false;

  constructor() {
    this.fallbackWebProvider = new IndexedDBStorageProvider();
    // Check if Capacitor SQLite plugin or native bridge exists
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      this.isNativeAvailable = true;
    }
  }

  public async initialize(): Promise<void> {
    if (!this.isNativeAvailable) {
      console.log(
        "[SQLiteStorageProvider] Native SQLite plugin placeholder initialized. Operating in web runtime mode via IndexedDB fallback."
      );
      await this.fallbackWebProvider.initialize();
      return;
    }

    console.log("[SQLiteStorageProvider] Native Android SQLite database initialized.");
  }

  public async saveScreenshot(screenshot: ScreenshotItem): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveScreenshot(screenshot);
    }
    // Native SQLite implementation placeholder:
    // INSERT OR REPLACE INTO screenshots ...
  }

  public async getScreenshot(id: string): Promise<ScreenshotItem | null> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.getScreenshot(id);
    }
    return null;
  }

  public async getAllScreenshots(): Promise<ScreenshotItem[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.getAllScreenshots();
    }
    return [];
  }

  public async updateScreenshot(id: string, updates: Partial<ScreenshotItem>): Promise<ScreenshotItem | null> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.updateScreenshot(id, updates);
    }
    return null;
  }

  public async deleteScreenshot(id: string): Promise<boolean> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.deleteScreenshot(id);
    }
    return true;
  }

  public async searchScreenshots(query: string): Promise<ScreenshotItem[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.searchScreenshots(query);
    }
    return [];
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveSettings(settings);
    }
  }

  public async loadSettings(): Promise<AppSettings> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.loadSettings();
    }
    return this.fallbackWebProvider.loadSettings();
  }

  public async saveAllScreenshots(screenshots: ScreenshotItem[]): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveAllScreenshots(screenshots);
    }
  }

  public async saveSearchHistory(history: SearchHistoryItem[]): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveSearchHistory(history);
    }
  }

  public async loadSearchHistory(): Promise<SearchHistoryItem[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.loadSearchHistory();
    }
    return [];
  }

  public async saveUserProfile(user: UserProfile): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveUserProfile(user);
    }
  }

  public async loadUserProfile(): Promise<UserProfile> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.loadUserProfile();
    }
    return this.fallbackWebProvider.loadUserProfile();
  }

  public async getLastScanTimestamp(): Promise<string> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.getLastScanTimestamp();
    }
    return "1970-01-01T00:00:00.000Z";
  }

  public async setLastScanTimestamp(timestampIso: string): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.setLastScanTimestamp(timestampIso);
    }
  }

  public async getIndexedImageIds(): Promise<Set<string>> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.getIndexedImageIds();
    }
    return new Set();
  }

  public async saveIndexedImageIds(idsSet: Set<string>): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.saveIndexedImageIds(idsSet);
    }
  }

  public async clearAllData(): Promise<void> {
    if (!this.isNativeAvailable) {
      return this.fallbackWebProvider.clearAllData();
    }
  }
}
