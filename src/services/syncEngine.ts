import { supabase, isSupabaseConfigured } from "./supabase";
import { StorageManager, loadStoredScreenshots, saveStoredScreenshots, loadSettings, loadSearchHistory } from "./storage";
import { ScreenshotItem, SyncStatus, AppSettings, SearchHistoryItem } from "../types";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncEngineService {
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnlineStatusChange(true));
      window.addEventListener("offline", () => this.handleOnlineStatusChange(false));
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {}
    });
  }

  private handleOnlineStatusChange(online: boolean): void {
    this.isOnline = online;
    this.notify();

    if (online) {
      console.log("[SyncEngine] Network connection restored. Scheduling automatic background sync...");
      this.scheduleSync(1500);
    }
  }

  public scheduleSync(delayMs: number = 1000): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncNow().catch((err) => {
        console.warn("[SyncEngine] Scheduled sync error:", err);
      });
    }, delayMs);
  }

  /**
   * Mark a screenshot as pending sync in local storage & queue sync
   */
  public async markScreenshotPending(item: ScreenshotItem): Promise<ScreenshotItem> {
    const updated: ScreenshotItem = {
      ...item,
      syncStatus: "Pending",
      syncError: undefined,
    };

    const provider = StorageManager.getProvider();
    await provider.saveScreenshot(updated);

    this.pendingCount++;
    this.notify();
    this.scheduleSync(500);

    return updated;
  }

  /**
   * Main sync process (Non-blocking background execution with exponential backoff)
   */
  public async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const settings = loadSettings();
    if (settings.syncEnabled === false) {
      console.log("[SyncEngine] Cloud sync is disabled in user settings.");
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const provider = StorageManager.getProvider();
      const screenshots = await provider.getAllScreenshots();

      const pendingItems = screenshots.filter(
        (sc) => sc.syncStatus === "Pending" || sc.syncStatus === "Failed" || !sc.syncStatus
      );

      this.pendingCount = pendingItems.length;
      this.notify();

      if (pendingItems.length === 0) {
        // Sync settings & history if configured
        await this.syncSettingsAndHistory(settings);
        this.lastSyncedAt = new Date().toISOString();
        this.isSyncing = false;
        this.notify();
        return;
      }

      console.log(`[SyncEngine] Starting background sync for ${pendingItems.length} items...`);

      for (const item of pendingItems) {
        if (!this.isOnline) break;

        // Mark item as Uploading
        const uploadingItem: ScreenshotItem = { ...item, syncStatus: "Uploading" };
        await provider.saveScreenshot(uploadingItem);

        const success = await this.syncSingleScreenshotWithRetry(uploadingItem, settings, 3);
        if (success) {
          const syncedItem: ScreenshotItem = {
            ...uploadingItem,
            syncStatus: "Synced",
            lastSyncedAt: new Date().toISOString(),
            syncError: undefined,
          };
          await provider.saveScreenshot(syncedItem);
        } else {
          const failedItem: ScreenshotItem = {
            ...uploadingItem,
            syncStatus: "Failed",
            syncError: "Network or cloud sync failed",
          };
          await provider.saveScreenshot(failedItem);
        }
      }

      await this.syncSettingsAndHistory(settings);

      // Refresh in-memory list
      const refreshed = await provider.getAllScreenshots();
      saveStoredScreenshots(refreshed);

      this.pendingCount = refreshed.filter((sc) => sc.syncStatus === "Pending" || sc.syncStatus === "Failed").length;
      this.lastSyncedAt = new Date().toISOString();
    } catch (err: any) {
      console.error("[SyncEngine] Sync failure:", err);
      this.lastError = err?.message || "Sync execution error";
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Sync single screenshot record to Supabase (or fallback cloud mock) with exponential backoff
   */
  private async syncSingleScreenshotWithRetry(
    item: ScreenshotItem,
    settings: AppSettings,
    maxRetries: number = 3
  ): Promise<boolean> {
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const success = await this.uploadToSupabase(item, settings);
        if (success) return true;
      } catch (err) {
        console.warn(`[SyncEngine] Attempt ${attempt}/${maxRetries} failed for screenshot ${item.id}:`, err);
      }

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }

    return false;
  }

  /**
   * Upload payload to Supabase database (Privacy Compliant: respects uploadImagesToCloud setting)
   */
  private async uploadToSupabase(item: ScreenshotItem, settings: AppSettings): Promise<boolean> {
    const payload = {
      id: item.id,
      user_id: item.user_id || item.userId || "guest",
      title: item.title,
      category: item.category,
      ocr_text: item.fullText || item.ocr_text || "",
      ai_description: item.summary || item.ai_description || "",
      tags: item.tags || [],
      keywords: item.keyEntities || item.keywords || [],
      key_metrics: item.keyMetrics || [],
      file_name: item.fileName || item.file_name || "screenshot.png",
      file_size_kb: item.fileSizeKB || 0,
      is_favorite: Boolean(item.isFavorite || item.favorite),
      date_created: item.createdAt || item.date_created,
      date_modified: item.dateModified || item.date_modified || new Date().toISOString(),
      indexed_at: item.indexedAt || item.indexed_at || new Date().toISOString(),
      // Privacy Protection: only sync image data URI if explicitly enabled by user
      image_uri: settings.uploadImagesToCloud ? item.imageUrl || item.image_uri : "[LOCAL_DEVICE_STORAGE_ONLY]",
    };

    if (isSupabaseConfigured) {
      // 1. Conflict resolution: Check remote updated_at before upsert
      const { data: remoteData } = await supabase
        .from("screenshots")
        .select("date_modified, indexed_at")
        .eq("id", item.id)
        .maybeSingle();

      if (remoteData && remoteData.date_modified) {
        const remoteTime = new Date(remoteData.date_modified).getTime();
        const localTime = new Date(item.dateModified || item.createdAt || Date.now()).getTime();

        // Conflict resolution: Remote is newer than local modification -> remote wins
        if (remoteTime > localTime) {
          console.log(`[SyncEngine] Conflict resolved (Remote is newer for ${item.id}).`);
          return true;
        }
      }

      // Upsert local record into Supabase
      const { error } = await supabase.from("screenshots").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("[SyncEngine] Supabase upsert error:", error.message);
        return false;
      }
      return true;
    } else {
      // Simulate successful cloud sync when client keys are placeholders
      await new Promise((res) => setTimeout(res, 300));
      return true;
    }
  }

  /**
   * Sync user settings & search history
   */
  private async syncSettingsAndHistory(settings: AppSettings): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      const history = loadSearchHistory();
      await supabase.from("user_settings").upsert({
        user_id: "guest",
        settings: settings,
        updated_at: new Date().toISOString(),
      });

      if (history.length > 0) {
        const historyRecords = history.slice(0, 30).map((h) => ({
          id: h.id,
          user_id: "guest",
          query: h.query,
          timestamp: h.timestamp,
          result_count: h.resultCount,
          category_filter: h.categoryFilter || "All",
        }));
        await supabase.from("search_history").upsert(historyRecords, { onConflict: "id" });
      }
    } catch (e) {
      console.warn("[SyncEngine] Failed to sync settings/history to Supabase:", e);
    }
  }
}

export const SyncEngine = new SyncEngineService();
