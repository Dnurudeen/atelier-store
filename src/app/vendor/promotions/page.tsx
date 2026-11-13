"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgePercent } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Product } from "@/lib/api";
import { discountPercent, formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Draft = { price: string; compare: string; ends: string };

/**
 * Run discounts: set a sale price under the original price, optionally with an end date
 * (shows a Flash Sale countdown on the storefront). Price changes go live instantly.
 */
export default function PromotionsPage() {
  const client = useQueryClient();
  const { data, isLoading } = useVendorQuery<{ data: Product[] }>("vendor-products", "/vendor/products?status=published&per_page=100");
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [bulk, setBulk] = useState("10");
  const [bulkEnds, setBulkEnds] = useState("");

  const draftFor = (p: Product): Draft =>
    drafts[p.id] ?? {
      price: String(Number(p.price)),
      compare: p.compare_at_price ? String(Number(p.compare_at_price)) : "",
      ends: p.sale_ends_at ? p.sale_ends_at.slice(0, 16) : "",
    };

  async function save(p: Product, override?: Draft) {
    const d = override ?? draftFor(p);
    if (d.compare && Number(d.compare) <= Number(d.price)) {
      toast.error(`${p.name}: the original price must be higher than the sale price.`);
      return false;
    }
    setSaving(p.id);
    try {
      await api(`/vendor/products/${p.id}`, {
        method: "PUT",
        body: {
          price: Number(d.price),
          compare_at_price: d.compare ? Number(d.compare) : null,
          sale_ends_at: d.compare && d.ends ? new Date(d.ends).toISOString() : null,
        },
      });
      setDrafts((all) => {
        const next = { ...all };
        delete next[p.id];
        return next;
      });
      return true;
    } catch (err) {
      toast.error(`${p.name}: ${errorMessage(err)}`);
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function applyBulk() {
    const pct = Number(bulk);
    if (!(pct > 0 && pct < 90) || !data) return;
    let ok = 0;
    for (const p of data.data) {
      const original = Number(p.compare_at_price || p.price);
      const price = Math.round(original * (1 - pct / 100));
      if (await save(p, { price: String(price), compare: String(original), ends: bulkEnds })) ok++;
    }
    toast.success(`${ok} product${ok === 1 ? "" : "s"} now ${pct}% off.`);
    void client.invalidateQueries({ queryKey: ["vendor-products"] });
  }

  return (
    <div className="space-y-3">
      <Panel title="Store-wide sale" bodyClassName="flex flex-wrap items-end gap-3 p-4 text-sm">
        <label className="space-y-1">
          <span className="block text-[13px] font-medium">Discount %</span>
          <input inputMode="numeric" value={bulk} onChange={(e) => setBulk(e.target.value.replace(/\D/g, ""))} className="h-10 w-24 rounded-md border border-border px-3" />
        </label>
        <label className="space-y-1">
          <span className="block text-[13px] font-medium">Ends (optional)</span>
          <input type="datetime-local" value={bulkEnds} onChange={(e) => setBulkEnds(e.target.value)} className="h-10 rounded-md border border-border px-3" />
        </label>
        <Button onClick={() => void applyBulk()} disabled={!data?.data.length || saving !== null}>
          Apply to all live products
        </Button>
        <p className="w-full text-[12px] text-muted">Discounts are calculated from each product&apos;s original price. Ending a sale automatically removes the old price.</p>
      </Panel>

      <Panel title="Product discounts">
        {isLoading ? (
          <ListSkeleton />
        ) : !data?.data.length ? (
          <EmptyState icon={BadgePercent} title="No live products yet" text="Discounts can be set once a product is approved." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 font-semibold">Original price (₦)</th>
                  <th className="px-4 py-2.5 font-semibold">Sale price (₦)</th>
                  <th className="px-4 py-2.5 font-semibold">Ends</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((p) => {
                  const d = draftFor(p);
                  const off = discountPercent(d.price, d.compare);
                  const set = (patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [p.id]: { ...d, ...patch } }));
                  return (
                    <tr key={p.id}>
                      <td className="max-w-[240px] px-4 py-2.5">
                        <p className="line-clamp-2 font-medium">{p.name}</p>
                        {off ? <span className="font-semibold text-crimson">-{off}% · was {formatNaira(d.compare)}</span> : <span className="text-muted">No discount</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <input inputMode="decimal" value={d.compare} placeholder="—" onChange={(e) => set({ compare: e.target.value.replace(/[^\d.]/g, "") })} className="h-9 w-28 rounded-md border border-border px-2" aria-label="Original price" />
                      </td>
                      <td className="px-4 py-2.5">
                        <input inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, "") })} className="h-9 w-28 rounded-md border border-border px-2" aria-label="Sale price" />
                      </td>
                      <td className="px-4 py-2.5">
                        <input type="datetime-local" value={d.ends} onChange={(e) => set({ ends: e.target.value })} disabled={!d.compare} className="h-9 rounded-md border border-border px-2 disabled:bg-surface" aria-label="Sale end" />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          loading={saving === p.id}
                          disabled={!drafts[p.id]}
                          onClick={async () => {
                            if (await save(p)) {
                              toast.success("Saved");
                              void client.invalidateQueries({ queryKey: ["vendor-products"] });
                            }
                          }}
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
