"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";

type Earnings = {
  available: number;
  paid: number;
  payouts: Array<{
    id: number;
    amount: number | string;
    commission: number | string;
    status: string;
    created_at?: string;
  }>;
};

export default function VendorEarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Earnings }>("/vendor/earnings")
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || "Unable to load earnings"));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Earnings</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Available" value={formatNaira(data?.available ?? 0)} />
        <StatCard label="Paid out" value={formatNaira(data?.paid ?? 0)} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Payout</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data?.payouts || []).map((payout) => (
              <tr key={payout.id} className="border-t border-border">
                <td className="px-4 py-3">#{payout.id}</td>
                <td className="px-4 py-3 capitalize">{payout.status}</td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">
                  {formatNaira(payout.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
