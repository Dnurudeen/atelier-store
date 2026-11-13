import { cn } from "@/lib/utils";

type Tone = "amber" | "sky" | "indigo" | "emerald" | "stone" | "rose" | "violet";

const TONES: Record<Tone, string> = {
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  sky: "bg-sky-50 text-sky-900 ring-sky-200",
  indigo: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  stone: "bg-stone-100 text-stone-600 ring-stone-200",
  rose: "bg-rose-50 text-rose-800 ring-rose-200",
  violet: "bg-violet-50 text-violet-900 ring-violet-200",
};

const MAP: Record<string, [string, Tone]> = {
  // orders / shipments
  pending: ["Pending", "amber"],
  paid: ["Paid · to process", "sky"],
  processing: ["Processing", "sky"],
  shipped: ["Shipped", "indigo"],
  delivered: ["Delivered", "emerald"],
  completed: ["Delivered", "emerald"],
  cancelled: ["Cancelled", "stone"],
  returned: ["Returned", "rose"],
  expired: ["Expired", "stone"],
  refunded: ["Refunded", "rose"],
  // payments
  failed: ["Failed", "rose"],
  abandoned: ["Not paid", "stone"],
  refund_due: ["Refund due", "rose"],
  success: ["Paid", "emerald"],
  // listings & stores
  draft: ["Draft", "stone"],
  published: ["Live", "emerald"],
  rejected: ["Rejected", "rose"],
  approved: ["Approved", "emerald"],
  suspended: ["Suspended", "rose"],
  active: ["Active", "emerald"],
  paused: ["Paused", "stone"],
  exhausted: ["Budget used", "stone"],
  // returns
  requested: ["Requested", "amber"],
  received: ["Refund due", "violet"],
  escalated: ["Escalated", "rose"],
  resolved: ["Closed", "stone"],
  // payouts
  available: ["Available", "sky"],
};

export function statusLabel(status?: string | null) {
  if (!status) return "—";
  return MAP[status]?.[0] ?? status.replace(/_/g, " ");
}

export function StatusBadge({ status, label, className }: { status?: string | null; label?: string; className?: string }) {
  const tone = (status && MAP[status]?.[1]) || "stone";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize ring-1 ring-inset", TONES[tone], className)}>
      {label ?? statusLabel(status)}
    </span>
  );
}
