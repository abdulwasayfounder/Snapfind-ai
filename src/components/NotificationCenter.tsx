import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage } from "../types";

interface NotificationCenterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  isDark: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  toasts,
  onDismiss,
  isDark,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? isDark
                ? "bg-slate-900/95 border-emerald-500/40 text-slate-100"
                : "bg-white border-emerald-200 text-slate-900"
              : toast.type === "error"
              ? isDark
                ? "bg-slate-900/95 border-rose-500/40 text-slate-100"
                : "bg-white border-rose-200 text-slate-900"
              : isDark
              ? "bg-slate-900/95 border-blue-500/40 text-slate-100"
              : "bg-white border-blue-200 text-slate-900"
          }`}
        >
          <div className="shrink-0 pt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
          </div>

          <div className="flex-1 space-y-0.5 text-xs">
            <h4 className="font-semibold">{toast.title}</h4>
            {toast.description && <p className="opacity-75 text-[11px]">{toast.description}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
