"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken } from "./api";

export type User = {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: "manager" | "employee";
  department: string;
  position?: string;
  phone?: string;
  status: string;
  avatar?: string;
  initials?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res: any = await api.me();
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res: any = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res.user as User;
  }, []);

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clearToken();
    setUser(null);
    router.push("/auth/sign-in");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Guard hook for dashboard pages: redirects if not authed / wrong role.
export function useRequireAuth(role?: "manager" | "employee") {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/sign-in");
    } else if (role && user.role !== role) {
      router.replace(user.role === "manager" ? "/dashboard/manager" : "/dashboard/employee");
    }
  }, [user, loading, role, router]);
  return { user, loading };
}
