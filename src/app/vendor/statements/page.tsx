"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";

type Statement = {
  id: number;
  period_start: string;
  period_end: string;
  sales: number | string;
  commission: number | string;
  sponsored_fees: number | string;
  net: number | string;
  status: string;
};

type Payload = {
  pending: number;
  sales: number;
  commission: number;
  sponsored_fees: number;
  paid: number;
  statements: Statement[];
};

export default function VendorStatementsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [month, setMonth] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Payload }>("/vendor/statements")
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || "Unable to load statements"));
  }, []);

  const history = useMemo(() => {
    const rows = data?.statements || [];
    if (!month) return rows;
    return rows.filter((row) => String(row.period_end).slice(0, 7) === month);
  }, [data, month]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Account statement</h2>
        <p className="text-sm text-muted">
          Delivered orders add your share here. Sponsored fees come off the same balance. Atelier pays the pending amount when the week is closed.
        </p>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={formatNaira(data?.pending ?? 0)} hint="Not yet on a statement" />
        <StatCard label="Open sales" value={formatNaira(data?.sales ?? 0)} />
        <StatCard label="Open commission" value={formatNaira(data?.commission ?? 0)} />
        <StatCard label="Paid out" value={formatNaira(data?.paid ?? 0)} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl">History</h3>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
          aria-label="Filter by month"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Sponsored</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {row.period_start} – {row.period_end}
                </td>
                <td className="px-4 py-3">{formatNaira(row.sales)}</td>
                <td className="px-4 py-3">{formatNaira(row.commission)}</td>
                <td className="px-4 py-3">{formatNaira(row.sponsored_fees)}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">{formatNaira(row.net)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No closed statements for this month yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
