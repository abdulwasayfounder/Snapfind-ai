import React from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  Grid,
  History,
  Settings,
  Upload,
  Bookmark,
  FileText,
  CreditCard,
  Utensils,
  QrCode,
  GraduationCap,
  ShoppingBag,
  Sparkles,
  Zap,
  LayoutDashboard,
  Search,
  Home,
} from "lucide-react";
import { CategoryType } from "../types";
import { NavViewType } from "./BottomNavigation";

interface SidebarProps {
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  isDark: boolean;
  indexedCount: number;
  favoriteCount: number;
}

const CATEGORY_ITEMS: { label: CategoryType; icon: any }[] = [
  { label: "All", icon: Grid },
  { label: "Passport", icon: Bookmark },
  { label: "Electricity Bill", icon: CreditCard },
  { label: "Recipe", icon: Utensils },
  { label: "QR Code", icon: QrCode },
  { label: "Admission & Certificate", icon: GraduationCap },
  { label: "E-Commerce", icon: ShoppingBag },
  { label: "Ticket & Travel", icon: FileText },
];

export const SidebarNavigation: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  selectedCategory,
  setSelectedCategory,
  isDark,
  indexedCount,
  favoriteCount,
}) => {
  return (
    <aside
      className={`w-64 shrink-0 hidden lg:block border-r p-4 min-h-[calc(100vh-4rem)] transition-colors duration-200 ${
        isDark
          ? "bg-slate-950/50 border-slate-850 text-slate-300"
          : "bg-slate-50 border-slate-200 text-slate-700"
      }`}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <SnapFindLogo className="w-11 h-11 rounded-xl object-cover shadow-md border-2 border-blue-500/40 ring-2 ring-blue-500/20 bg-slate-900" />
          <div>
            <h2 className="font-bold text-sm tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              SnapFind
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Stop Scrolling. Start Searching.</p>
          </div>
        </div>

        {/* Core Screen Navigation */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-3">
            Core Screens
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveView("landing")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "landing"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-indigo-400" />
                <span>Landing Page</span>
              </div>
            </button>

            <button
              onClick={() => setActiveView("dashboard")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "dashboard"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-blue-500" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveView("gallery");
                setSelectedCategory("All");
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "gallery" && selectedCategory === "All"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Grid className="w-4 h-4 text-sky-400" />
                <span>Gallery</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/40 text-slate-400 font-mono">
                {indexedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveView("search")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "search"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-amber-400" />
                <span>Search</span>
              </div>
            </button>

            <button
              onClick={() => setActiveView("import")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "import"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import & OCR</span>
              </div>
            </button>

            <button
              onClick={() => setActiveView("history")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "history"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-purple-400" />
                <span>Search History</span>
              </div>
            </button>

            <button
              onClick={() => setActiveView("settings")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === "settings"
                  ? isDark
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "bg-blue-50 text-blue-600 font-semibold border border-blue-200"
                  : isDark
                  ? "hover:bg-slate-900 text-slate-300"
                  : "hover:bg-slate-200/60 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Categories Facets */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-3">
            Category Facets
          </p>
          <div className="space-y-1">
            {CATEGORY_ITEMS.map(({ label, icon: Icon }) => {
              const isActive = activeView === "gallery" && selectedCategory === label;
              return (
                <button
                  key={label}
                  onClick={() => {
                    setSelectedCategory(label);
                    setActiveView("gallery");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? isDark
                        ? "bg-blue-500/20 text-blue-300 font-medium"
                        : "bg-blue-100 text-blue-800 font-medium"
                      : isDark
                      ? "hover:bg-slate-900/80 text-slate-400 hover:text-slate-200"
                      : "hover:bg-slate-200/50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate max-w-[130px]">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
