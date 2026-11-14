"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Sponsorship = { id: number; budget: string; daily_amount: string; spent: string; status: string; product?: Product };

export default function SponsoredPage() {
  const client = useQueryClient();
  const products = useVendorQuery<{ data: Product[] }>("vendor-products", "/vendor/products?status=published&per_page=100");
  const rows = useVendorQuery<{ data: Sponsorship[] }>("vendor-sponsorships", "/vendor/sponsorships");
  const [productId, setProductId] = useState("");
  const [budget, setBudget] = useState("5000");
  const [daily, setDaily] = useState("500");
  const [busy, setBusy] = useState<string | number | null>(null);

  const refresh = () => void client.invalidateQueries({ queryKey: ["vendor-sponsorships"] });

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!productId) {
      toast.error("Choose a product to sponsor.");
      return;
    }
    setBusy("new");
    try {
      await api("/vendor/sponsorships", { method: "POST", body: { product_id: Number(productId), budget: Number(budget), daily_amount: Number(daily) } });
      toast.success(`Sponsorship started. Up to ${formatNaira(daily)} a day comes off your pending balance.`);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function toggle(row: Sponsorship) {
    setBusy(row.id);
    try {
      await api(`/vendor/sponsorships/${row.id}`, { method: "PUT", body: { status: row.status === "paused" ? "active" : "paused" } });
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Panel title="Sponsor a product" bodyClassName="p-4">
        <p className="mb-3 text-[13px] text-muted">
          Sponsored products appear in the home page “Sponsored” rail and at the top of their category, marked “Sponsored”. The daily fee is deducted from your pending balance. No card needed. Charges pause when your balance can&apos;t cover them.
        </p>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_150px_150px_auto] md:items-end">
          <label className="block space-y-1.5">
            <span className="block text-[13px] font-medium text-foreground/80">Live product</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
              <option value="">Choose a product</option>
              {(products.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Total budget (₦)" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} hint="Min ₦500" />
          <Input label="Per day (₦)" inputMode="numeric" value={daily} onChange={(e) => setDaily(e.target.value.replace(/\D/g, ""))} hint="Min ₦100" />
          <Button type="submit" loading={busy === "new"} disabled={Number(budget) < 500 || Number(daily) < 100}>
            Start
          </Button>
        </form>
      </Panel>

      <Panel title="Your sponsorships">
        {rows.isLoading ? (
          <ListSkeleton />
        ) : !rows.data?.data.length ? (
          <EmptyState icon={Megaphone} title="No sponsored products yet" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.data.data.map((row) => {
              const pct = Math.min(100, (Number(row.spent) / Math.max(1, Number(row.budget))) * 100);
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{row.product?.name ?? `Product #${row.id}`}</p>
                    <p className="text-muted">
                      {formatNaira(row.spent)} of {formatNaira(row.budget)} spent · {formatNaira(row.daily_amount)}/day
                    </p>
                    <div className="mt-1 h-1.5 max-w-xs overflow-hidden rounded-full bg-border" aria-hidden>
                      <div className="h-full rounded-full bg-crimson" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                  {row.status !== "exhausted" && (
                    <Button size="sm" variant="outline" loading={busy === row.id} onClick={() => void toggle(row)}>
                      {row.status === "paused" ? "Resume" : "Pause"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
