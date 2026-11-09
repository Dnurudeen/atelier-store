"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Overview = {
  gmv: number;
  orders: number;
  vendors: number;
  customers: number;
  pending_vendors: number;
  pending_products: number;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Overview }>("/admin/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || "Unable to load admin overview"));
  }, []);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">Platform health for the Atelier Nigeria marketplace.</p>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV" value={formatNaira(data?.gmv ?? 0)} />
        <StatCard label="Orders" value={String(data?.orders ?? 0)} />
        <StatCard label="Vendors" value={String(data?.vendors ?? 0)} />
        <StatCard label="Customers" value={String(data?.customers ?? 0)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/vendors" className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30">
          <p className="text-xs tracking-widest text-muted uppercase">Vendors</p>
          <p className="mt-2 font-medium">{data?.pending_vendors ?? 0} pending applications</p>
        </Link>
        <Link href="/admin/products" className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30">
          <p className="text-xs tracking-widest text-muted uppercase">Moderation</p>
          <p className="mt-2 font-medium">{data?.pending_products ?? 0} pending products</p>
        </Link>
        <Link href="/admin/payouts" className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30">
          <p className="text-xs tracking-widest text-muted uppercase">Payouts</p>
          <p className="mt-2 font-medium">Vendor disbursements</p>
        </Link>
      </div>
    </div>
  );
}
