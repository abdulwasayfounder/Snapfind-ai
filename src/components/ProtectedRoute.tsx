import React from "react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onOpenAuth: () => void;
  isDark: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onOpenAuth,
  isDark,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Verifying authentication status...</p>
      </div>
    );
  }

  return <>{children}</>;
};
