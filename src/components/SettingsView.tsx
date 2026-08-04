import React from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  Settings,
  Moon,
  Sun,
  Database,
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  Bell,
  Trash2,
} from "lucide-react";
import { AppSettings, UserProfile } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  user: UserProfile;
  isDark: boolean;
  indexedCount: number;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  isDark,
  onResetAllData,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>SnapFind Settings & Configuration</span>
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Manage theme aesthetics, storage limits, and privacy preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Appearance Settings */}
        <div
          className={`p-5 rounded-3xl border space-y-4 ${
            isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>Appearance & Theme</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => onUpdateSettings({ theme: "dark" })}
              className={`p-3 rounded-2xl border text-center font-medium transition-all cursor-pointer ${
                settings.theme === "dark"
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Dark Mode
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: "light" })}
              className={`p-3 rounded-2xl border text-center font-medium transition-all cursor-pointer ${
                settings.theme === "light"
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Light Mode
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: "system" })}
              className={`p-3 rounded-2xl border text-center font-medium transition-all cursor-pointer ${
                settings.theme === "system"
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              System
            </button>
          </div>
        </div>

        {/* Account & Privacy */}
        <div
          className={`p-5 rounded-3xl border space-y-4 ${
            isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Privacy & Reset</span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            All screenshot metadata is securely indexed. Your data remains private to your app session.
          </p>

          <button
            onClick={onResetAllData}
            className="w-full py-2 px-3 rounded-xl border border-rose-800/40 text-rose-400 hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Reset All Screenshots</span>
          </button>
        </div>
      </div>

      {/* Production Deployment & QA Guides Section */}
      <div
        className={`p-6 rounded-3xl border space-y-5 ${
          isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4 border-slate-800/80">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>Production Deployment & Testing Guides</span>
            </h3>
            <p className="text-xs opacity-70 mt-0.5">
              Production environment setup, testing procedure, and bug validation checklist.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Deployment Card */}
          <div className="p-4 rounded-2xl border bg-slate-950/40 border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-blue-400">
              <CheckCircle className="w-4 h-4" />
              <span>Deployment Guide</span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed">
              Bundle frontend SPA and Node server via <code>npm run build</code>. Start production process with <code>npm start</code> on port 3000.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-1">
              File: DEPLOYMENT.md
            </div>
          </div>

          {/* Testing Card */}
          <div className="p-4 rounded-2xl border bg-slate-950/40 border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-emerald-400">
              <RefreshCw className="w-4 h-4" />
              <span>Testing Guide</span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed">
              Validate OCR extraction accuracy, natural language queries, search history persistence, pagination, and offline fallback mode.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-1">
              File: TESTING.md
            </div>
          </div>

          {/* QA Bug Checklist */}
          <div className="p-4 rounded-2xl border bg-slate-950/40 border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-amber-400">
              <Bell className="w-4 h-4" />
              <span>Bug & QA Checklist</span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed">
              No leaked client keys, offline network resilience, lazy image preloading, error boundary guards, and zero linter warnings.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-1">
              File: BUG_CHECKLIST.md
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
