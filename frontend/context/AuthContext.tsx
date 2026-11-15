"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, AUTH_EXPIRED_EVENT, tokenStore } from "@/lib/api";
import type { Organization, Role, User } from "@/types";

type Status = "loading" | "authed" | "anon";

interface Session {
  status: Status;
  user: User | null;
  organization: Organization | null;
}

interface SessionResponse {
  token: string;
  user: User;
  organization: Organization;
}

export interface RegisterInput {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue extends Session {
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  /** True when the signed-in user's role is one of the given roles. */
  hasRole: (...roles: Role[]) => boolean;
  /** Admin, manager and analyst may create and edit; viewers are read-only. */
  canWrite: boolean;
  /** Admin and manager only (deactivating vendors, changing contract status, deleting documents). */
  canManage: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ANON: Session = { status: "anon", user: null, organization: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading", user: null, organization: null });

  // On first load, if a token is stored, ask the API who it belongs to. The server is the authority:
  // a stored token proves nothing until /auth/me accepts it.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!tokenStore.get()) {
        if (!cancelled) setSession(ANON);
        return;
      }
      try {
        const data = await api.get<{ user: User; organization: Organization }>("/auth/me");
        if (!cancelled) setSession({ status: "authed", user: data.user, organization: data.organization });
      } catch {
        tokenStore.clear();
        if (!cancelled) setSession(ANON);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client fires this event when any request returns 401 while holding a token.
  useEffect(() => {
    const onExpired = () => setSession(ANON);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const start = useCallback((data: SessionResponse) => {
    tokenStore.set(data.token);
    setSession({ status: "authed", user: data.user, organization: data.organization });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => start(await api.post<SessionResponse>("/auth/login", { email, password })),
    [start]
  );

  const register = useCallback(async (input: RegisterInput) => start(await api.post<SessionResponse>("/auth/register", input)), [start]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setSession(ANON);
  }, []);

  const setUser = useCallback((user: User) => setSession((s) => (s.status === "authed" ? { ...s, user } : s)), []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session.user?.role;
    const hasRole = (...roles: Role[]) => (role ? roles.includes(role) : false);
    return {
      ...session,
      login,
      register,
      logout,
      setUser,
      hasRole,
      canWrite: hasRole("admin", "manager", "analyst"),
      canManage: hasRole("admin", "manager"),
    };
  }, [session, login, register, logout, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
