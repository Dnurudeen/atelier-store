"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, setToken, type User } from "@/lib/api";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (user: User, token: string) => void;
  clear: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
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
      setSession: (user, token) => {
        setToken(token);
        set({ user, token });
      },
      clear: () => {
        setToken(null);
        set({ user: null, token: null });
      },
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
      fetchMe: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await api<{ data: User }>("/auth/me");
          set({ user: res.data });
        } catch {
          get().clear();
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
    }
  )
);
