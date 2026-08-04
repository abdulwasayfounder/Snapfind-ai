import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { UserProfile } from "../types";
import { loadUserProfile, saveUserProfile } from "../services/storage";

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => loadUserProfile());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Fallback local mode session management
      setLoading(false);
      return;
    }

    // 1. Callback Handler: Exchange OAuth code for session when returning from provider
    const processAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const hash = window.location.hash;

      if (code) {
        console.log("[AuthContext] Exchanging OAuth code for session via exchangeCodeForSession...");
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthContext] Code exchange error:", error.message);
          } else if (data?.session) {
            console.log("[AuthContext] Session created for user:", data.session.user.email);
            setSession(data.session);
            setSupabaseUser(data.session.user);
            syncProfile(data.session.user);

            // If running inside a popup window, notify parent opener and close self
            if (window.opener && window.opener !== window) {
              try {
                window.opener.postMessage(
                  { type: "OAUTH_AUTH_SUCCESS", session: data.session },
                  "*"
                );
              } catch (e) {
                console.warn("[AuthContext] Failed to postMessage to popup opener:", e);
              }
              window.close();
              return;
            }
          }
        } catch (err) {
          console.error("[AuthContext] Exception during code exchange:", err);
        } finally {
          // Clean up URL query param so code is not reused
          const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
          window.history.replaceState({}, document.title, cleanPath);
        }
      } else if (hash && hash.includes("access_token")) {
        // Handle hash fragment authentication
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          setSupabaseUser(data.session.user);
          syncProfile(data.session.user);

          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage(
                { type: "OAUTH_AUTH_SUCCESS", session: data.session },
                "*"
              );
            } catch (e) {
              console.warn("[AuthContext] Failed to postMessage to popup opener:", e);
            }
            window.close();
            return;
          }
        }
        const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
      }
    };

    processAuthCallback();

    // 2. Fetch current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        syncProfile(session.user);
      }
      setLoading(false);
    });

    // 3. Listen to persistent Auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${_event}`);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        syncProfile(session.user);
      } else if (_event === "SIGNED_OUT") {
        // Logged out
        const guestUser = loadUserProfile();
        const loggedOutUser = { ...guestUser, isLoggedIn: false };
        setUser(loggedOutUser);
        saveUserProfile(loggedOutUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = (sbUser: User) => {
    const name =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.email?.split("@")[0] ||
      "User";
    const avatarUrl =
      sbUser.user_metadata?.avatar_url ||
      sbUser.user_metadata?.picture ||
      undefined;

    const updatedProfile: UserProfile = {
      id: sbUser.id,
      name,
      email: sbUser.email || "",
      avatarUrl,
      isLoggedIn: true,
      plan: "Pro",
      storageLimitMB: 5000,
    };
    setUser(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      // Demo authentication simulation
      const mockUser: UserProfile = {
        id: `local-${Date.now()}`,
        name: email.split("@")[0],
        email,
        isLoggedIn: true,
        plan: "Pro",
        storageLimitMB: 5000,
      };
      setUser(mockUser);
      saveUserProfile(mockUser);
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) return { error: error.message };
    return {};
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    if (!isSupabaseConfigured) {
      const mockUser: UserProfile = {
        id: `local-${Date.now()}`,
        name: name || email.split("@")[0],
        email,
        isLoggedIn: true,
        plan: "Pro",
        storageLimitMB: 5000,
      };
      setUser(mockUser);
      saveUserProfile(mockUser);
      return {};
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name || email.split("@")[0],
        },
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      // Demo authentication simulation when Supabase credentials are not set
      const googleUser: UserProfile = {
        id: `google_${Date.now()}`,
        name: "Google Account User",
        email: "user.google@gmail.com",
        avatarUrl: undefined,
        isLoggedIn: true,
        plan: "Pro",
        storageLimitMB: 5000,
      };
      setUser(googleUser);
      saveUserProfile(googleUser);
      return {};
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });

      if (error) {
        console.error("[AuthContext] Supabase Google OAuth error:", error.message);
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error("[AuthContext] Supabase Google Auth exception:", err);
      return { error: err?.message || "Google authentication failed" };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    const current = loadUserProfile();
    const loggedOutUser = { ...current, isLoggedIn: false };
    setUser(loggedOutUser);
    saveUserProfile(loggedOutUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
