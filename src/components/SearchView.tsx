import React, { useState, useEffect } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  CheckCircle,
  HelpCircle,
  Clock,
} from "lucide-react";
import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { instantKeywordSearch } from "../services/api";
import { PaginationControls } from "./PaginationControls";

interface SearchViewProps {
  screenshots: ScreenshotItem[];
  searchResults: SearchResultMatch[];
  query: string;
  setQuery: (q: string) => void;
  onExecuteSearch: (q: string) => void;
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  isDark: boolean;
  isSearching: boolean;
  onSelectScreenshot: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDelete: (id: string) => void;
  onCopyText: (text: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  screenshots,
  searchResults,
  query,
  setQuery,
  onExecuteSearch,
  selectedCategory,
  setSelectedCategory,
  isDark,
  isSearching,
  onSelectScreenshot,
  onToggleFavorite,
  onMoveCategory,
  onDelete,
  onCopyText,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory, searchResults]);
  const categories: CategoryType[] = [
    "All",
    "Passport",
    "Electricity Bill",
    "Recipe",
    "QR Code",
    "Admission & Certificate",
    "E-Commerce",
  ];

  // Compute instant effective matches (0ms latency fallback + AI scores)
  const activeMatches = query.trim()
    ? searchResults.length > 0
      ? searchResults
      : instantKeywordSearch(query, screenshots)
    : [];

  const matchMap = new Map<string, SearchResultMatch>(activeMatches.map((r) => [r.id, r]));

  // Filter items
  const displayItems = (query.trim()
    ? screenshots.filter((s) => matchMap.has(s.id))
    : screenshots
  ).filter((item) => selectedCategory === "All" || item.category === selectedCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onExecuteSearch(query);
    }
  };

  // Generate conversational search summary
  const generateConversationalSummary = (items: ScreenshotItem[]): string => {
    if (items.length === 0) return "No matching screenshots were found.";
    if (items.length === 1) {
      const item = items[0];
      const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
      return `I found 1 matching screenshot: ${item.title} from ${dateStr}.`;
    }

    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const newest = sorted[0];
    const newestDate = new Date(newest.createdAt).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });

    const others = sorted.slice(1);
    let othersText = "";

    if (others.length === 1) {
      othersText = `The other is ${others[0].title.toLowerCase()}.`;
    } else if (others.length === 2) {
      othersText = `The others include ${others[0].title.toLowerCase()} and ${others[1].title.toLowerCase()}.`;
    } else {
      const catCounts: Record<string, number> = {};
      others.forEach((item) => {
        const cat = item.category.toLowerCase();
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      const parts = Object.entries(catCounts).map(([cat, count]) =>
        count > 1 ? `${count} ${cat} items` : `a ${cat}`
      );

      if (parts.length === 1) {
        othersText = `The others include ${parts[0]}.`;
      } else if (parts.length === 2) {
        othersText = `The others include ${parts[0]} and ${parts[1]}.`;
      } else {
        othersText = `The others include ${parts.slice(0, 2).join(", ")}, and more.`;
      }
    }

    return `I found ${items.length} matching screenshots. The newest is a ${newest.title.toLowerCase()} from ${newestDate}. ${othersText}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Natural Language Screenshot Search
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Multimodal Gemini 3.6 Search Engine</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Ask naturally like "Show the passport screenshot I saved last week" or "Find the pizza recipe I downloaded".
        </p>
      </div>

      {/* Huge Google-Style Search Input Form */}
      <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
        <div
          className={`relative flex items-center rounded-full border-2 px-6 py-4 sm:py-5 shadow-xl transition-all duration-300 hover:shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/20 ${
            isDark
              ? "bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/60 focus-within:border-blue-500"
              : "bg-white border-slate-300 text-slate-900 shadow-slate-200/80 focus-within:border-blue-500"
          }`}
        >
          <Search className="w-6 h-6 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Show the passport screenshot I saved last week"...'
            className="w-full bg-transparent border-none outline-none text-base sm:text-xl font-normal placeholder-slate-400 py-1"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all shrink-0 ml-2"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Searching...</span>
              </span>
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Category Facet Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                : isDark
                ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Results List / Grid */}
      <div className="space-y-4">
        {query.trim() && (
          <div
            className={`p-5 rounded-2xl border backdrop-blur-md space-y-2 shadow-lg transition-all ${
              isDark
                ? "bg-slate-900/90 border-blue-500/40 text-slate-100 shadow-black/40"
                : "bg-blue-50/70 border-blue-300 text-slate-900 shadow-blue-500/10"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                AI Search Summary
              </span>
              {searchResults.length > 0 && (
                <span className="text-emerald-400 flex items-center gap-1 text-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Gemini Ranked</span>
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-medium leading-relaxed opacity-95">
              {generateConversationalSummary(displayItems)}
            </p>
          </div>
        )}

        {displayItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayItems
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item) => {
                  const match = matchMap.get(item.id);
                  return (
                    <ScreenshotCard
                      key={item.id}
                      item={item}
                      matchInfo={match}
                      isDark={isDark}
                      onSelect={onSelectScreenshot}
                      onToggleFavorite={onToggleFavorite}
                      onMoveCategory={onMoveCategory}
                      onDelete={onDelete}
                      onCopyText={onCopyText}
                    />
                  );
                })}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(displayItems.length / itemsPerPage) || 1}
              totalItems={displayItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(num) => setItemsPerPage(num)}
              isDark={isDark}
            />
          </>
        ) : (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-800 space-y-3">
            <Search className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="font-bold text-sm">No screenshots match your search query</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your query or upload more screenshots using the batch importer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
