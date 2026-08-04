import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScreenshotItem,
  SearchResultMatch,
  SearchHistoryItem,
  CategoryType,
  ToastMessage,
  AppSettings,
  UserProfile,
} from "./types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  loadSearchHistory,
  saveSearchHistory,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  initializeStorage,
} from "./services/storage";
import { searchScreenshotsAI, instantKeywordSearch } from "./services/api";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { SearchBar } from "./components/SearchBar";
import { ScreenshotGrid } from "./components/ScreenshotGrid";
import { ImageViewerModal } from "./components/ImageViewerModal";
import { BatchImporter } from "./components/BatchImporter";
import { SearchHistoryView } from "./components/SearchHistoryView";
import { SettingsView } from "./components/SettingsView";
import { AuthModal } from "./components/AuthModal";
import { NotificationCenter } from "./components/NotificationCenter";
import { StatsOverview } from "./components/StatsOverview";
import { BottomNavigation, NavViewType } from "./components/BottomNavigation";
import { LandingScreen } from "./components/LandingScreen";
import { DashboardView } from "./components/DashboardView";
import { SearchView } from "./components/SearchView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { OfflineBanner } from "./components/OfflineBanner";

function AppContent() {
  const { user: authUser, signOut } = useAuth();
  const isOnline = useOnlineStatus();

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>(() => loadStoredScreenshots());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");

  const [activeView, setActiveView] = useState<NavViewType>("landing");
  const [selectedItem, setSelectedItem] = useState<ScreenshotItem | null>(null);

  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => loadSearchHistory());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keep local user profile in sync with Auth Context
  const activeUser = authUser || userProfile;

  // Initialize Production Storage Provider (IndexedDB / SQLite) & Automatic localStorage Migration
  useEffect(() => {
    initializeStorage().then(() => {
      setScreenshots(loadStoredScreenshots());
      setSettings(loadSettings());
      setSearchHistory(loadSearchHistory());
      setUserProfile(loadUserProfile());
    });
  }, []);

  // Sync screenshots to storage
  useEffect(() => {
    saveStoredScreenshots(screenshots);
  }, [screenshots]);

  // Sync settings to storage & handle dark/light mode class
  useEffect(() => {
    saveSettings(settings);
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  // Toast Helper
  const addToast = (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { ...msg, id, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Execute Natural Language Search via AI (Instant 0ms + Background AI Refinement)
  const handleExecuteSearch = async (queryToRun: string) => {
    const q = queryToRun.trim();
    setSearchQuery(q);

    if (!q) {
      setSearchResults([]);
      return;
    }

    // 1. Instant local search (0ms latency)
    const instantResults = instantKeywordSearch(q, screenshots);
    setSearchResults(instantResults);
    setActiveView("search");

    // Add to search history immediately
    const newHistoryItem: SearchHistoryItem = {
      id: `sh-${Date.now()}`,
      query: q,
      timestamp: new Date().toISOString(),
      resultCount: instantResults.length,
      categoryFilter: selectedCategory,
    };
    const updatedHistory = [newHistoryItem, ...searchHistory.filter((h) => h.query !== q)];
    setSearchHistory(updatedHistory);
    saveSearchHistory(updatedHistory);

    // 2. Background AI refinement (non-blocking)
    setIsSearching(true);
    try {
      const results = await searchScreenshotsAI(q, screenshots);
      if (results && results.length > 0) {
        setSearchResults(results);
      }
    } catch (err) {
      console.error("AI search refinement fallback:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = (id: string) => {
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, isFavorite: !item.isFavorite };
          if (selectedItem?.id === id) setSelectedItem(updated);
          return updated;
        }
        return item;
      })
    );
  };

  // Move screenshot category
  const handleMoveCategory = (id: string, newCategory: CategoryType) => {
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, category: newCategory };
          if (selectedItem?.id === id) setSelectedItem(updated);
          return updated;
        }
        return item;
      })
    );
    addToast({
      title: "Category Updated",
      description: `Moved screenshot to "${newCategory}".`,
      type: "success",
    });
  };

  // Batch delete
  const handleBatchDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    setScreenshots((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSearchResults((prev) => prev.filter((r) => !idSet.has(r.id)));
    if (selectedItem && idSet.has(selectedItem.id)) setSelectedItem(null);
    addToast({
      title: `${ids.length} Screenshots Deleted`,
      description: "Removed selected items from index.",
      type: "info",
    });
  };

  // Batch favorite / unfavorite
  const handleBatchFavorite = (ids: string[], isFavorite: boolean) => {
    const idSet = new Set(ids);
    setScreenshots((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, isFavorite } : item))
    );
    if (selectedItem && idSet.has(selectedItem.id)) {
      setSelectedItem({ ...selectedItem, isFavorite });
    }
    addToast({
      title: isFavorite ? "Marked as Favorite" : "Favorites Updated",
      description: `Updated ${ids.length} screenshot(s).`,
      type: "success",
    });
  };

  // Batch move category
  const handleBatchMoveCategory = (ids: string[], targetCategory: CategoryType) => {
    const idSet = new Set(ids);
    setScreenshots((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, category: targetCategory } : item))
    );
    if (selectedItem && idSet.has(selectedItem.id)) {
      setSelectedItem({ ...selectedItem, category: targetCategory });
    }
    addToast({
      title: "Category Batch Moved",
      description: `Moved ${ids.length} item(s) to "${targetCategory}".`,
      type: "success",
    });
  };

  // Delete screenshot
  const handleDeleteScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
    setSearchResults((prev) => prev.filter((r) => r.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    addToast({
      title: "Screenshot Removed",
      description: "Deleted from your local index.",
      type: "info",
    });
  };

  // Copy OCR text helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: "OCR Text Copied",
      description: "Copied extracted text to clipboard.",
      type: "success",
    });
  };

  // Add new imported screenshots
  const handleAddScreenshots = (newItems: ScreenshotItem[]) => {
    setScreenshots((prev) => [...newItems, ...prev]);
  };

  // Theme toggle
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === "dark" ? "light" : "dark";
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Reset data
  const handleResetAllData = () => {
    if (window.confirm("Are you sure you want to clear all screenshots and reset search history?")) {
      setScreenshots([]);
      setSearchResults([]);
      setSearchHistory([]);
      localStorage.clear();
      addToast({
        title: "System Reset Complete",
        description: "Cleared all screenshots & index cache.",
        type: "info",
      });
    }
  };

  const isDark = settings.theme === "dark";

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 pb-20 lg:pb-0 ${
        isDark ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        user={activeUser}
        settings={settings}
        onToggleTheme={handleToggleTheme}
        onOpenImport={() => setActiveView("import")}
        onOpenAuth={() => setIsAuthOpen(true)}
        totalIndexedCount={screenshots.length}
        currentSearchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex max-w-7xl mx-auto">
        {/* Left Sidebar */}
        <SidebarNavigation
          activeView={activeView}
          setActiveView={setActiveView}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          isDark={isDark}
          indexedCount={screenshots.length}
          favoriteCount={screenshots.filter((s) => s.isFavorite).length}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
          {!isOnline && <OfflineBanner isDark={isDark} />}

          <AnimatePresence mode="wait">
            {/* Landing View (Public) */}
            {activeView === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <LandingScreen
                  onGetStarted={() => setActiveView("dashboard")}
                  onTrySearch={(q) => {
                    handleExecuteSearch(q);
                  }}
                  isDark={isDark}
                  totalIndexed={screenshots.length}
                />
              </motion.div>
            )}

            {/* Dashboard View (Protected) */}
            {activeView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <DashboardView
                    screenshots={screenshots}
                    isDark={isDark}
                    onNavigate={(v) => setActiveView(v)}
                    onSelectCategory={(cat) => setSelectedCategory(cat)}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onExecuteSearch={handleExecuteSearch}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Main Gallery View (Public Preview / Accessible) */}
            {activeView === "gallery" && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <SearchBar
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  onExecuteSearch={handleExecuteSearch}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  isDark={isDark}
                  isSearching={isSearching}
                />

                <StatsOverview
                  screenshots={screenshots}
                  isDark={isDark}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                />

                <ScreenshotGrid
                  screenshots={screenshots}
                  searchResults={searchResults}
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  isDark={isDark}
                  onSelect={(item) => setSelectedItem(item)}
                  onToggleFavorite={handleToggleFavorite}
                  onMoveCategory={handleMoveCategory}
                  onDelete={handleDeleteScreenshot}
                  onBatchDelete={handleBatchDelete}
                  onBatchFavorite={handleBatchFavorite}
                  onBatchMoveCategory={handleBatchMoveCategory}
                  onCopyText={handleCopyText}
                  onOpenImport={() => setActiveView("import")}
                />
              </motion.div>
            )}

            {/* AI Search Screen */}
            {activeView === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <SearchView
                  screenshots={screenshots}
                  searchResults={searchResults}
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  onExecuteSearch={handleExecuteSearch}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  isDark={isDark}
                  isSearching={isSearching}
                  onSelectScreenshot={(item) => setSelectedItem(item)}
                  onToggleFavorite={handleToggleFavorite}
                  onMoveCategory={handleMoveCategory}
                  onDelete={handleDeleteScreenshot}
                  onCopyText={handleCopyText}
                />
              </motion.div>
            )}

            {/* Import View (Protected) */}
            {activeView === "import" && (
              <motion.div
                key="import"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <BatchImporter
                    onAddScreenshots={handleAddScreenshots}
                    isDark={isDark}
                    onFinishImport={() => setActiveView("gallery")}
                    addToast={addToast}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Search History View (Protected) */}
            {activeView === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <SearchHistoryView
                    history={searchHistory}
                    onExecuteSearch={(q) => {
                      handleExecuteSearch(q);
                    }}
                    onClearHistory={() => setSearchHistory([])}
                    isDark={isDark}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Settings View (Protected) */}
            {activeView === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <SettingsView
                    settings={settings}
                    onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
                    user={activeUser}
                    isDark={isDark}
                    indexedCount={screenshots.length}
                    onResetAllData={handleResetAllData}
                  />
                </ProtectedRoute>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Responsive Bottom Navigation Bar */}
      <BottomNavigation
        activeView={activeView}
        setActiveView={setActiveView}
        isDark={isDark}
        indexedCount={screenshots.length}
      />

      {/* Lightbox Screenshot Inspector Modal */}
      <ImageViewerModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        isDark={isDark}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteScreenshot}
        onSearchTag={(tag) => handleExecuteSearch(tag)}
      />

      {/* User Auth / Profile Modal */}
      {isAuthOpen && (
        <AuthModal onClose={() => setIsAuthOpen(false)} isDark={isDark} addToast={addToast} />
      )}

      {/* Toast Notifications */}
      <NotificationCenter toasts={toasts} onDismiss={handleDismissToast} isDark={isDark} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
