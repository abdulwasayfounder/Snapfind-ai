import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  Star,
  FolderInput,
  X,
  Copy,
  LayoutGrid,
  Grid3X3,
  List,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { PaginationControls } from "./PaginationControls";
import { preloadImages } from "../services/imageCache";

interface ScreenshotGridProps {
  screenshots: ScreenshotItem[];
  searchResults: SearchResultMatch[];
  searchQuery: string;
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  isDark: boolean;
  onSelect: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDelete: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchFavorite?: (ids: string[], isFavorite: boolean) => void;
  onBatchMoveCategory?: (ids: string[], newCategory: CategoryType) => void;
  onCopyText: (text: string) => void;
  onOpenImport: () => void;
}

const ALL_CATEGORIES: CategoryType[] = [
  "All",
  "Favorites",
  "Passport",
  "Electricity Bill",
  "Recipe",
  "QR Code",
  "Ticket & Travel",
  "Receipt & Invoice",
  "Notes & Ideas",
  "Chat & Message",
  "Code & Dev",
  "E-Commerce",
  "Admission & Certificate",
  "Financial",
  "Other",
];

const TARGET_MOVE_CATEGORIES: CategoryType[] = [
  "Passport",
  "Electricity Bill",
  "Recipe",
  "QR Code",
  "Ticket & Travel",
  "Receipt & Invoice",
  "Notes & Ideas",
  "Chat & Message",
  "Code & Dev",
  "E-Commerce",
  "Admission & Certificate",
  "Financial",
  "Other",
];

export const ScreenshotGrid: React.FC<ScreenshotGridProps> = ({
  screenshots,
  searchResults,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  isDark,
  onSelect,
  onToggleFavorite,
  onMoveCategory,
  onDelete,
  onBatchDelete,
  onBatchFavorite,
  onBatchMoveCategory,
  onCopyText,
  onOpenImport,
}) => {
  const [sortMode, setSortMode] = useState<"recent" | "oldest" | "category" | "title">("recent");
  const [viewLayout, setViewLayout] = useState<"grid" | "compact" | "list">("grid");
  const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals state
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<CategoryType>("Passport");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, sortMode, searchQuery, localSearch]);

  // Clear selection if category or query changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedCategory, searchQuery]);

  // Handle single item selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all items in view
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  // Filter screenshots by Category / Favorites
  let filtered = screenshots.filter((item) => {
    if (selectedCategory === "All") return true;
    if (selectedCategory === "Favorites") return item.isFavorite;
    return item.category === selectedCategory;
  });

  // Local Keyword Search inside Gallery
  if (localSearch.trim()) {
    const term = localSearch.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.fullText.toLowerCase().includes(term) ||
        item.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  // Map match info from AI search
  const matchMap = new Map<string, SearchResultMatch>();
  searchResults.forEach((r) => matchMap.set(r.id, r));

  // If active AI search query, filter & sort by search match
  if (searchQuery.trim()) {
    if (searchResults.length > 0) {
      const matchIds = new Set(searchResults.map((r) => r.id));
      filtered = filtered.filter((item) => matchIds.has(item.id));

      // Sort by search score descending
      filtered.sort((a, b) => {
        const scoreA = matchMap.get(a.id)?.score || 0;
        const scoreB = matchMap.get(b.id)?.score || 0;
        return scoreB - scoreA;
      });
    } else {
      // Fallback simple query filter
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.fullText.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
  } else {
    // Standard sorting
    if (sortMode === "recent") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortMode === "category") {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortMode === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  // Preload images for current items
  useEffect(() => {
    if (filtered.length > 0) {
      preloadImages(filtered.slice(0, 24).map((f) => f.imageUrl));
    }
  }, [filtered]);

  // Calculate paginated subset
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Bulk Actions
  const handleExecuteBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (onBatchDelete) {
      onBatchDelete(ids);
    } else {
      ids.forEach((id) => onDelete(id));
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleExecuteBulkFavorite = (isFav: boolean) => {
    const ids = Array.from(selectedIds);
    if (onBatchFavorite) {
      onBatchFavorite(ids, isFav);
    } else {
      ids.forEach((id) => onToggleFavorite(id));
    }
    setSelectedIds(new Set());
  };

  const handleExecuteBulkMove = () => {
    const ids = Array.from(selectedIds);
    if (onBatchMoveCategory) {
      onBatchMoveCategory(ids, targetCategory);
    } else if (onMoveCategory) {
      ids.forEach((id) => onMoveCategory(id, targetCategory));
    }
    setSelectedIds(new Set());
    setShowBulkMoveModal(false);
  };

  const handleExecuteBulkCopyText = () => {
    const ids = Array.from(selectedIds);
    const selectedItems = screenshots.filter((s) => ids.includes(s.id));
    const combinedText = selectedItems
      .map((s) => `--- ${s.title} (${s.category}) ---\n${s.fullText || s.summary}`)
      .join("\n\n");
    onCopyText(combinedText);
  };

  return (
    <div className="space-y-8 relative">
      {/* Category Pills & Interactive Filters Toolbar */}
      <div className="space-y-4 pb-4 border-b border-slate-800/40 dark:border-slate-800">
        {/* Category & Special Filter Pills */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const isFavPill = cat === "Favorites";
              const isSelectedCat = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                    isSelectedCat
                      ? isFavPill
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                        : "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : isDark
                      ? "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      : "bg-slate-100 border border-slate-200/80 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isFavPill && <Star className={`w-3.5 h-3.5 ${isSelectedCat ? "fill-white" : "text-amber-400 fill-amber-400"}`} />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gallery Controls & Selection Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Quick Search inside Gallery */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter gallery..."
              className={`w-full pl-9 pr-8 py-2 rounded-2xl text-xs font-medium border outline-none transition-all ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500"
                  : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
              }`}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            {/* Multi-Select Toggle */}
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              className={`px-3.5 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${
                isSelectionMode || selectedIds.size > 0
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>{isSelectionMode ? "Exit Select" : "Multi-Select"}</span>
            </button>

            {/* Select All (when selection active) */}
            {(isSelectionMode || selectedIds.size > 0) && (
              <button
                onClick={handleToggleSelectAll}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {selectedIds.size === paginatedItems.length && paginatedItems.length > 0
                  ? "Deselect Page"
                  : "Select Page"}
              </button>
            )}

            {/* Layout View Switcher */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <button
                onClick={() => setViewLayout("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Default Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("compact")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "compact" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Compact Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortMode}
              onChange={(e: any) => setSortMode(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold bg-transparent outline-none cursor-pointer ${
                isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"
              }`}
            >
              <option value="recent">Sort: Most Recent</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="category">Sort: Category</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content with Apple-style Gap Spacing */}
      {filtered.length > 0 ? (
        <>
          <motion.div
            layout
            className={
              viewLayout === "compact"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
                : viewLayout === "list"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            }
          >
            {paginatedItems.map((item) => (
              <ScreenshotCard
                key={item.id}
                item={item}
                matchInfo={matchMap.get(item.id)}
                isDark={isDark}
                isSelected={selectedIds.has(item.id)}
                isSelectionMode={isSelectionMode || selectedIds.size > 0}
                onSelect={onSelect}
                onToggleSelect={handleToggleSelect}
                onToggleFavorite={onToggleFavorite}
                onMoveCategory={onMoveCategory}
                onDelete={onDelete}
                onCopyText={onCopyText}
              />
            ))}
          </motion.div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(num) => setItemsPerPage(num)}
            isDark={isDark}
          />
        </>
      ) : (
        /* Empty State */
        <div
          className={`text-center py-16 px-4 rounded-3xl border flex flex-col items-center justify-center ${
            isDark
              ? "bg-slate-900/50 border-slate-800 text-slate-300"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <div className="text-5xl mb-4 select-none animate-bounce">📸</div>
          <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-100">
            {screenshots.length === 0
              ? "Upload your first screenshot."
              : "No matching screenshots found."}
          </h3>
          <p className="text-sm opacity-75 max-w-md mx-auto mb-6">
            {screenshots.length === 0
              ? "We'll organize it automatically."
              : searchQuery || localSearch
              ? `No screenshots matched your filters. Try clearing search terms or upload new ones.`
              : `We'll organize it automatically.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(searchQuery || localSearch || selectedCategory !== "All") && screenshots.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setLocalSearch("");
                }}
                className="px-4 py-2.5 rounded-2xl border text-xs font-semibold hover:bg-slate-800/20 transition-all"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={onOpenImport}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all"
            >
              Upload Screenshot
            </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl p-3 sm:p-4 rounded-3xl border shadow-2xl backdrop-blur-2xl bg-slate-950/90 border-blue-500/40 text-slate-100 flex flex-wrap items-center justify-between gap-3"
          >
            {/* Selection Counter */}
            <div className="flex items-center gap-2 px-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-bold text-sm tracking-tight">
                {selectedIds.size} Selected
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Favorite All */}
              <button
                onClick={() => handleExecuteBulkFavorite(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all"
                title="Favorite selected"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Favorite</span>
              </button>

              {/* Move Category */}
              <button
                onClick={() => setShowBulkMoveModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all"
                title="Move category"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move Category</span>
              </button>

              {/* Copy OCR */}
              <button
                onClick={handleExecuteBulkCopyText}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                title="Copy all text"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy OCR</span>
              </button>

              {/* Delete Selected */}
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              {/* Deselect All */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all ml-1"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Move Category Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-blue-400" />
                <span>Move {selectedIds.size} Screenshots</span>
              </h3>
              <button onClick={() => setShowBulkMoveModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-80 leading-relaxed">
              Select the destination category for all selected screenshots:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {TARGET_MOVE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTargetCategory(cat)}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                    targetCategory === cat
                      ? "bg-blue-600 text-white border-blue-400 shadow-md"
                      : isDark
                      ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkMoveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800/20"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkMove}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-lg">Delete {selectedIds.size} Screenshots?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This action will permanently delete the selected screenshots from your local index.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800/20"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
