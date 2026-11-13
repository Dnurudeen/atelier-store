"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, setToken, type User } from "@/lib/api";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  setSession: (user: User, token: string) => void;
  clear: () => void;
  setHydrated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role?: "customer" | "vendor";
    phone?: string;
    store_name?: string;
    newsletter_opt_in?: boolean;
  }) => Promise<void>;
  setUser: (user: User) => void;
  loginWithGoogle: (idToken: string, role?: "customer" | "vendor") => Promise<void>;
  completeOnboarding: (payload: {
    name?: string;
    phone: string;
    role?: "customer" | "vendor";
  }) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setSession: (user, token) => {
        setToken(token);
        set({ user, token });
      },
      clear: () => {
        setToken(null);
        set({ user: null, token: null });
      },
      setUser: (user) => set({ user }),
      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await api<{ data: { user: User; token: string } }>("/auth/login", {
            method: "POST",
            body: { email, password },
            token: null,
          });
          get().setSession(res.data.user, res.data.token);
        } finally {
          set({ loading: false });
        }
      },
      register: async (payload) => {
        set({ loading: true });
        try {
          const res = await api<{ data: { user: User; token: string } }>("/auth/register", {
            method: "POST",
            body: payload,
            token: null,
          });
          get().setSession(res.data.user, res.data.token);
        } finally {
          set({ loading: false });
        }
      },
      loginWithGoogle: async (idToken, role = "customer") => {
        set({ loading: true });
        try {
          const res = await api<{ data: { user: User; token: string } }>("/auth/google", {
            method: "POST",
            body: { id_token: idToken, role },
            token: null,
          });
          get().setSession(res.data.user, res.data.token);
        } finally {
          set({ loading: false });
        }
      },
      completeOnboarding: async (payload) => {
        set({ loading: true });
        try {
          const res = await api<{ data: User }>("/auth/complete-onboarding", {
            method: "POST",
            body: payload,
          });
          set({ user: res.data });
        } finally {
          set({ loading: false });
        }
      },
      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          setToken(null);
          return;
        }
        setToken(token);
        try {
          const res = await api<{ data: User }>("/auth/me");
          set({ user: res.data });
        } catch (err) {
          // Only drop the session when the server rejected it, not on a network blip.
          const status = (err as { status?: number })?.status;
          if (status === 401 || status === 403) get().clear();
        }
      },
      logout: async () => {
        try {
          await api("/auth/logout", { method: "POST" });
        } catch {
          // ignore
        }
        get().clear();
      },
    }),
    {
      name: "atelier-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setToken(state.token);
        } else {
          setToken(null);
        }
        state?.setHydrated(true);
      },
    }
  )
);
