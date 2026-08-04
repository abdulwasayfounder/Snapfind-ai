import React from "react";
import {
  LayoutDashboard,
  Grid,
  Search,
  Upload,
  History,
  Settings,
  Sparkles,
} from "lucide-react";

export type NavViewType = "landing" | "dashboard" | "gallery" | "search" | "import" | "history" | "settings";

interface BottomNavigationProps {
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
  isDark: boolean;
  indexedCount: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeView,
  setActiveView,
  isDark,
  indexedCount,
}) => {
  const navItems: { id: NavViewType; label: string; icon: any; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "gallery", label: "Gallery", icon: Grid, badge: indexedCount },
    { id: "search", label: "Search", icon: Search },
    { id: "import", label: "Import", icon: Upload },
    { id: "history", label: "History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl transition-colors duration-200 block lg:hidden ${
        isDark
          ? "bg-slate-950/90 border-slate-800 text-slate-300"
          : "bg-white/90 border-slate-200 text-slate-700"
      }`}
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl relative transition-all duration-200 ${
                isActive
                  ? isDark
                    ? "text-blue-400 font-semibold"
                    : "text-blue-600 font-semibold"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110 text-blue-500" : ""}`} />
                {item.id === "search" && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-4 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
