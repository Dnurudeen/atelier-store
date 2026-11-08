import { demoPayouts, formatNaira } from "@/lib/demo-dashboard";
import { cn } from "@/lib/utils";

const payoutStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-900",
  processing: "bg-sky-50 text-sky-900",
  scheduled: "bg-amber-50 text-amber-900",
};

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Vendor payouts</h2>
        <p className="mt-1 text-sm text-muted">Scheduled and completed disbursements.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-widest text-muted uppercase">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {demoPayouts.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{row.id}</td>
                <td className="px-4 py-3 text-muted">{row.vendor}</td>
                <td className="px-4 py-3 text-muted">{row.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      payoutStyles[row.status] ?? "bg-stone-100"
                    )}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">
                  {formatNaira(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
