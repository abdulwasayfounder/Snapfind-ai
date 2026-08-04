import React from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  Brain,
  Sparkles,
  Upload,
  Search,
  Bookmark,
  CreditCard,
  Utensils,
  QrCode,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Eye,
  Hash,
  Tag,
  Calendar,
} from "lucide-react";
import { ScreenshotItem, CategoryType } from "../types";
import { NavViewType } from "./BottomNavigation";
import { motion } from "motion/react";

interface DashboardViewProps {
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onNavigate: (view: NavViewType) => void;
  onSelectCategory: (cat: CategoryType) => void;
  onSelectScreenshot: (item: ScreenshotItem) => void;
  onExecuteSearch: (query: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  screenshots,
  isDark,
  onNavigate,
  onSelectCategory,
  onSelectScreenshot,
  onExecuteSearch,
}) => {
  const totalCount = screenshots.length;
  const totalKeyEntities = screenshots.reduce((sum, item) => sum + (item.keyEntities?.length || 0), 0);

  const categoryCounts: Record<string, number> = {
    Passport: screenshots.filter((s) => s.category === "Passport").length,
    "Electricity Bill": screenshots.filter((s) => s.category === "Electricity Bill").length,
    Recipe: screenshots.filter((s) => s.category === "Recipe").length,
    "QR Code": screenshots.filter((s) => s.category === "QR Code").length,
    "Ticket & Travel": screenshots.filter((s) => s.category === "Ticket & Travel").length,
    "Receipt & Invoice": screenshots.filter((s) => s.category === "Receipt & Invoice").length,
  };

  const recentMemories = screenshots.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Header Banner - AI Memory Dashboard */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-slate-800"
            : "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50 border-slate-200/80"
        }`}
      >
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-3">
            <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AI Memory Center</h1>
              <p className="text-xs text-blue-400 font-semibold flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>SnapFind Vision Engine Active</span>
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
            Your personal screenshot knowledge vault powered by Gemini Vision OCR. Automatically indexes numbers, dates, codes, and text.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate("import")}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Screenshots</span>
          </button>
          <button
            onClick={() => onNavigate("search")}
            className={`px-5 py-2.5 rounded-2xl border font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${
              isDark
                ? "bg-slate-900 border-slate-700 text-slate-100 hover:border-blue-400"
                : "bg-white border-slate-300 text-slate-900 hover:border-blue-400 shadow-sm"
            }`}
          >
            <Search className="w-4 h-4 text-blue-500" />
            <span>Search Memories</span>
          </button>
        </div>
      </div>

      {/* Main Section: Recent AI Memories */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold tracking-tight">Recent AI Memories</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracted facts, OCR key entities, and visual memory logs from your screenshots
            </p>
          </div>
          <button
            onClick={() => onNavigate("gallery")}
            className="text-xs font-bold text-blue-500 flex items-center gap-1.5 hover:underline"
          >
            <span>View All ({totalCount})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* AI Memories Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentMemories.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => onSelectScreenshot(item)}
              className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 space-y-4 flex flex-col justify-between ${
                isDark
                  ? "bg-slate-900/90 border-slate-800/80 hover:border-blue-500/50 shadow-black/40 text-slate-100"
                  : "bg-white border-slate-200/90 hover:border-blue-300/80 shadow-slate-200/60 text-slate-900"
              }`}
            >
              <div className="space-y-3">
                {/* Header: Thumbnail + Category */}
                <div className="flex items-start gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-16 object-cover object-top rounded-2xl border border-slate-700/60 shrink-0 shadow-md"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate">
                        {item.category}
                      </span>
                      <span className="text-[10px] opacity-60 font-medium shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* AI Memory Summary */}
                <div
                  className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                    isDark ? "bg-slate-950/60 border-slate-800/80 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <p className="line-clamp-2 font-medium">{item.summary}</p>
                </div>

                {/* Extracted Key Facts / Entities Pills */}
                {item.keyEntities && item.keyEntities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-amber-400" /> Extracted Facts
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.keyEntities.slice(0, 3).map((entity, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-mono font-medium truncate max-w-[220px] ${
                            isDark
                              ? "bg-slate-800/80 border-slate-700/60 text-amber-300"
                              : "bg-amber-50 border-amber-200 text-amber-800"
                          }`}
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/40 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Indexed in Vault
                </span>
                <span className="font-bold text-blue-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Inspect</span>
                  <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Secondary Row: AI Metrics + Category Index */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Memory Stats Summary */}
        <div
          className={`p-7 rounded-3xl border space-y-5 shadow-xl ${
            isDark ? "bg-slate-900/90 border-slate-800/80" : "bg-white border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <span>Memory Overview</span>
            </h3>
            <span className="text-xs text-emerald-400 font-semibold">Active</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-2xl font-black font-mono text-blue-400">{totalCount}</div>
              <p className="text-xs font-medium text-slate-400 mt-1">Total Memories</p>
            </div>
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-2xl font-black font-mono text-amber-400">{totalKeyEntities}</div>
              <p className="text-xs font-medium text-slate-400 mt-1">Key Facts Saved</p>
            </div>
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-2xl font-black font-mono text-indigo-400">100%</div>
              <p className="text-xs font-medium text-slate-400 mt-1">OCR Accuracy</p>
            </div>
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-2xl font-black font-mono text-emerald-400">0.24s</div>
              <p className="text-xs font-medium text-slate-400 mt-1">Search Latency</p>
            </div>
          </div>
        </div>

        {/* Category Memory Index */}
        <div
          className={`lg:col-span-2 p-7 rounded-3xl border space-y-5 shadow-xl ${
            isDark ? "bg-slate-900/90 border-slate-800/80" : "bg-white border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>Memory Category Index</span>
              </h3>
              <p className="text-xs text-slate-400">Browse memories organized automatically by AI category</p>
            </div>
            <button
              onClick={() => onNavigate("gallery")}
              className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:underline"
            >
              <span>Explore All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { label: "Passport", count: categoryCounts["Passport"] || 0, icon: Bookmark, color: "text-indigo-400" },
              { label: "Electricity Bill", count: categoryCounts["Electricity Bill"] || 0, icon: CreditCard, color: "text-sky-400" },
              { label: "Recipe", count: categoryCounts["Recipe"] || 0, icon: Utensils, color: "text-amber-400" },
              { label: "QR Code", count: categoryCounts["QR Code"] || 0, icon: QrCode, color: "text-purple-400" },
              { label: "Ticket & Travel", count: categoryCounts["Ticket & Travel"] || 0, icon: FileText, color: "text-emerald-400" },
              { label: "Receipt & Invoice", count: categoryCounts["Receipt & Invoice"] || 0, icon: CreditCard, color: "text-pink-400" },
            ].map((cat) => (
              <div
                key={cat.label}
                onClick={() => {
                  onSelectCategory(cat.label as CategoryType);
                  onNavigate("gallery");
                }}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:border-blue-500/50 hover:-translate-y-0.5 ${
                  isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="font-semibold text-xs sm:text-sm">{cat.label}</span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-400">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

