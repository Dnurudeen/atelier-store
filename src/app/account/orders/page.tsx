import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoCustomerOrders } from "@/lib/demo-dashboard";
import { formatNaira } from "@/lib/utils";

export default function AccountOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Orders</h2>
        <p className="mt-1 text-sm text-muted">Track purchases from Nigerian makers on Atelier.</p>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {demoCustomerOrders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium">{order.id}</p>
              <p className="text-sm text-muted">
                {order.date} · {order.itemsCount} item{order.itemsCount > 1 ? "s" : ""}
                {order.store ? ` · ${order.store}` : null}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={order.status} />
              <span className="min-w-[6rem] text-right font-semibold text-burgundy">
                {formatNaira(order.total)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Need help?{" "}
        <Link href="/contact" className="font-medium text-burgundy hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}
