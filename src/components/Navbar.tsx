import React from "react";
import { Sparkles, Sun, Moon, UploadCloud, User, Search, ShieldCheck, LayoutDashboard, Grid, Home } from "lucide-react";
import { SnapFindLogo } from "./SnapFindLogo";
import { UserProfile, AppSettings } from "../types";
import { NavViewType } from "./BottomNavigation";

interface NavbarProps {
  user: UserProfile;
  settings: AppSettings;
  onToggleTheme: () => void;
  onOpenImport: () => void;
  onOpenAuth: () => void;
  totalIndexedCount: number;
  currentSearchQuery: string;
  onSearchChange: (val: string) => void;
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  onToggleTheme,
  onOpenImport,
  onOpenAuth,
  totalIndexedCount,
  currentSearchQuery,
  onSearchChange,
  activeView,
  setActiveView,
}) => {
  const isDark = settings.theme === "dark";
  const [avatarError, setAvatarError] = React.useState(false);

  React.useEffect(() => {
    setAvatarError(false);
  }, [user.avatarUrl]);

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? "bg-slate-950/85 border-slate-800 text-slate-100"
          : "bg-white/90 border-slate-200 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo Branding */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <SnapFindLogo className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200 border-2 border-blue-500/40 ring-2 ring-blue-500/20 bg-slate-900" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  SnapFind
                </span>
              </div>
              <p className="text-[10px] opacity-60 font-medium">Vision Index Engine</p>
            </div>
          </div>

          {/* Quick Screen Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 ml-4 text-xs font-semibold">
            <button
              onClick={() => setActiveView("landing")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeView === "landing" ? "bg-blue-600 text-white shadow-sm" : "opacity-70 hover:opacity-100"
              }`}
            >
              Landing
            </button>
            <button
              onClick={() => setActiveView("dashboard")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeView === "dashboard" ? "bg-blue-600 text-white shadow-sm" : "opacity-70 hover:opacity-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView("gallery")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeView === "gallery" ? "bg-blue-600 text-white shadow-sm" : "opacity-70 hover:opacity-100"
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setActiveView("search")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeView === "search" ? "bg-blue-600 text-white shadow-sm" : "opacity-70 hover:opacity-100"
              }`}
            >
              Search
            </button>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Index count pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isDark
                ? "bg-slate-900/80 border-slate-800 text-slate-300"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{totalIndexedCount} Indexed</span>
          </div>

          {/* Import screenshots button */}
          <button
            onClick={onOpenImport}
            id="import-btn-header"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-sm transition-all duration-200 active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Import Screenshots</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            id="theme-toggle-btn"
            title="Toggle theme"
            className={`p-2 rounded-xl border transition-colors duration-200 ${
              isDark
                ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* User Profile avatar / Auth */}
          <button
            onClick={onOpenAuth}
            id="user-profile-btn"
            title={user.isLoggedIn ? user.name : "Sign In"}
            className={`flex items-center gap-2 p-1.5 px-3 rounded-xl border transition-colors duration-200 cursor-pointer ${
              isDark
                ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200"
                : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800"
            }`}
          >
            {user.avatarUrl && user.isLoggedIn && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-5 h-5 rounded-lg object-cover shrink-0"
              />
            ) : (
              <User className="w-4 h-4 text-blue-500 shrink-0" />
            )}
            <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">
              {user.isLoggedIn ? user.name : "Sign In"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
