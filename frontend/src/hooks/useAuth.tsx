"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, token } from "@/lib/api";
import type { User } from "@/lib/types";

interface Auth {
  user: User | null;
  loading: boolean;
  signIn: (t: string) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Auth>({ user: null, loading: true, signIn: async () => { throw new Error(); }, signOut: () => {}, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token.get()) { setUser(null); setLoading(false); return; }
    try { setUser(await api.auth.me()); } catch { token.clear(); setUser(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = useCallback(async (t: string) => {
    token.set(t);
    const u = await api.auth.me();
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(() => { token.clear(); setUser(null); }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
