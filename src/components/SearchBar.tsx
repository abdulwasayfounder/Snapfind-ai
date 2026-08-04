import React from "react";
import { Search, X, Sparkles, Filter, SlidersHorizontal, ArrowRight } from "lucide-react";
import { CategoryType } from "../types";

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  onExecuteSearch: (q: string) => void;
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  isDark: boolean;
  isSearching: boolean;
}

const EXAMPLE_QUERIES = [
  "Show the passport screenshot I saved last week",
  "Find the pizza recipe I downloaded",
  "Show electricity bill due amount",
  "Find my flight confirmation ticket",
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  setQuery,
  onExecuteSearch,
  selectedCategory,
  setSelectedCategory,
  isDark,
  isSearching,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onExecuteSearch(query);
    }
  };

  return (
    <div className="w-full space-y-4 max-w-3xl mx-auto">
      {/* Huge Google-Style Search Bar */}
      <div
        className={`relative flex items-center rounded-full border-2 px-6 py-4 sm:py-5 shadow-xl transition-all duration-300 hover:shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/20 ${
          isDark
            ? "bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/60 focus-within:border-blue-500"
            : "bg-white border-slate-300 text-slate-900 shadow-slate-200/80 focus-within:border-blue-500"
        }`}
      >
        <div className="pr-3 text-blue-500 flex items-center shrink-0">
          {isSearching ? (
            <Sparkles className="w-6 h-6 animate-spin text-blue-400" />
          ) : (
            <Search className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try "Show the passport screenshot I saved last week"...'
          className="w-full bg-transparent border-none outline-none text-base sm:text-lg font-normal placeholder-slate-400 py-1"
        />

        {query && (
          <button
            onClick={() => {
              setQuery("");
              onExecuteSearch("");
            }}
            className="p-2 rounded-full hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 mr-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => onExecuteSearch(query)}
          disabled={isSearching}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-sm transition-all duration-200 shrink-0 shadow-lg shadow-blue-500/30"
        >
          <span>Search</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Try:
        </span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            onClick={() => {
              setQuery(example);
              onExecuteSearch(example);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border ${
              query === example
                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                : isDark
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};
