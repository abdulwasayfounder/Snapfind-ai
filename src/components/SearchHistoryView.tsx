import React from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import { History, Search, Trash2, ArrowUpRight, Sparkles, Clock } from "lucide-react";
import { SearchHistoryItem } from "../types";

interface SearchHistoryViewProps {
  history: SearchHistoryItem[];
  onExecuteSearch: (query: string) => void;
  onClearHistory: () => void;
  isDark: boolean;
}

export const SearchHistoryView: React.FC<SearchHistoryViewProps> = ({
  history,
  onExecuteSearch,
  onClearHistory,
  isDark,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span>Recent Search History</span>
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              Your recent natural language search queries and retrieved screenshot results.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-rose-950/20 text-rose-400 border-rose-800/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onExecuteSearch(item.query)}
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:border-blue-500 ${
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.query}</p>
                  <div className="flex items-center gap-2 text-[11px] opacity-60 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>•</span>
                    <span>{item.resultCount} Results found</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                  Search again
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`text-center py-12 px-4 rounded-3xl border ${
            isDark ? "bg-slate-900/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200"
          }`}
        >
          <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="font-bold text-sm mb-1">No search history recorded yet</h3>
          <p className="text-xs opacity-60">Search queries will appear here for fast re-execution.</p>
        </div>
      )}
    </div>
  );
};
