import { StatusBadge } from "@/components/ui/status-badge";
import { demoVendorOrders } from "@/lib/demo-dashboard";
import { formatNaira } from "@/lib/utils";

export default function VendorOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Orders</h2>
        <p className="mt-1 text-sm text-muted">Fulfill and track customer purchases.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-widest text-muted uppercase">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {demoVendorOrders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{order.id}</td>
                <td className="px-4 py-3 text-muted">{order.date}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">
                  {formatNaira(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
