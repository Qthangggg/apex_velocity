import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Profile } from "./shop-types";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  error: string;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const revision = useRef(0);
  const userId = useRef<string | null>(null);
  const profileSnapshot = useRef<Profile | null>(null);

  const loadProfile = useCallback(
    async (nextUser: User | null, blockWhileLoading = false) => {
      const current = ++revision.current;
      const nextUserId = nextUser?.id ?? null;
      const changedUser = userId.current !== nextUserId;
      if (changedUser) {
        queryClient.clear();
        profileSnapshot.current = null;
      }
      userId.current = nextUserId;
      setUser(nextUser);
      if (changedUser || !nextUser) setProfile(null);
      setError("");
      if (!nextUser || !supabase) {
        setLoading(false);
        return;
      }
      if (changedUser || blockWhileLoading) setLoading(true);
      try {
        const { data, error: failure } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", nextUser.id)
          .single();
        if (current !== revision.current) return;
        if (failure) throw failure;
        const nextProfile = data as Profile;
        const previous = profileSnapshot.current;
        if (
          previous &&
          (previous.role !== nextProfile.role || previous.is_active !== nextProfile.is_active)
        )
          queryClient.clear();
        profileSnapshot.current = nextProfile;
        setProfile(nextProfile);
      } catch {
        if (current === revision.current) {
          profileSnapshot.current = null;
          setProfile(null);
          queryClient.clear();
          setError("Không tải được hồ sơ hoặc quyền tài khoản. Vui lòng thử lại.");
        }
      } finally {
        if (current === revision.current) setLoading(false);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (live) void loadProfile(session?.user ?? null);
      });
    });
    void supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!live) return;
      if (failure) {
        profileSnapshot.current = null;
        setProfile(null);
        queryClient.clear();
        setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        setLoading(false);
      } else void loadProfile(data.session?.user ?? null);
    });
    return () => {
      live = false;
      revision.current += 1;
      subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user, profileSnapshot.current?.role === "admin");
  }, [loadProfile, user]);

  useEffect(() => {
    if (!supabase || !user) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshProfile();
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = window.setInterval(refreshIfVisible, 60_000);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [refreshProfile, user]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: failure } = await supabase.auth.signOut();
    if (failure) throw failure;
    await loadProfile(null);
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isAdmin: profile?.role === "admin" && profile.is_active,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
