import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/demo-dashboard";

const styles: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  processing: "bg-sky-50 text-sky-900 ring-sky-200",
  shipped: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
  refunded: "bg-rose-50 text-rose-800 ring-rose-200",
};

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
