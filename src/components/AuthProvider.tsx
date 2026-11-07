import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let version = 0;
    const refresh = async () => {
      const current = ++version;
      const { data, error } = await supabase.auth.getUser();
      if (active && current === version) {
        setUser(error ? null : data.user);
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        version++;
        setUser(null);
        setLoading(false);
      } else {
        // Leave the auth callback before calling another auth method.
        window.setTimeout(() => { if (active) void refresh(); }, 0);
        void queryClient.invalidateQueries();
      }
      void router.invalidate();
    });
    void refresh();
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAccount = () => useContext(AuthContext);