"use client";

import Link from "next/link";
import { create } from "zustand";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string; action?: { label: string; href: string } };

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { ...toast, id }] });
    window.setTimeout(() => get().dismiss(id), toast.tone === "error" ? 6000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string, action?: Toast["action"]) => useToastStore.getState().push({ tone: "success", message, action }),
  error: (message: string) => useToastStore.getState().push({ tone: "error", message }),
  info: (message: string, action?: Toast["action"]) => useToastStore.getState().push({ tone: "info", message, action }),
};

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tones = {
  success: "border-emerald-600/20 [&_svg.lead]:text-emerald-600",
  error: "border-crimson/30 [&_svg.lead]:text-crimson",
  info: "border-burgundy/20 [&_svg.lead]:text-burgundy",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 md:top-auto md:right-5 md:bottom-5 md:left-auto md:items-end"
    >
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-white px-3.5 py-3 text-sm shadow-xl animate-fade-up",
              tones[t.tone]
            )}
          >
            <Icon className="lead mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="leading-snug">{t.message}</p>
              {t.action && (
                <Link href={t.action.href} onClick={() => dismiss(t.id)} className="mt-1 inline-block text-[13px] font-semibold text-crimson hover:underline">
                  {t.action.label}
                </Link>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-foreground">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
