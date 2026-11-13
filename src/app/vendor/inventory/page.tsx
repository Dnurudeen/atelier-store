"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, Search } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Product } from "@/lib/api";
import { useVendorQuery } from "@/lib/vendor";

type Edit = { stock?: string; price?: string };

/** Spreadsheet-style quick edit of stock and price, saved in one request. */
export default function InventoryPage() {
  const client = useQueryClient();
  const [tab, setTab] = useState<"all" | "low_stock" | "out_of_stock">("low_stock");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useVendorQuery<{ data: Product[]; meta: { counts: Record<string, number> } }>(
    "vendor-products",
    `/vendor/products?per_page=100&status=${tab === "all" ? "" : tab}&q=${encodeURIComponent(query)}&sort=stock`
  );
  const dirty = useMemo(() => Object.entries(edits).filter(([, e]) => e.stock !== undefined || e.price !== undefined), [edits]);

  async function save() {
    setSaving(true);
    try {
      const items = dirty.map(([id, e]) => ({
        id: Number(id),
        ...(e.stock !== undefined && e.stock !== "" ? { stock: Number(e.stock) } : {}),
        ...(e.price !== undefined && e.price !== "" ? { price: Number(e.price) } : {}),
      }));
      const res = await api<{ message: string }>("/vendor/products/inventory", { method: "POST", body: { items } });
      toast.success(res.message);
      setEdits({});
      void client.invalidateQueries({ queryKey: ["vendor-products"] });
      void client.invalidateQueries({ queryKey: ["vendor-overview"] });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "low_stock", label: "Low stock", count: data?.meta.counts.low_stock },
          { value: "out_of_stock", label: "Sold out", count: data?.meta.counts.out_of_stock },
          { value: "all", label: "All products", count: data?.meta.counts.all },
        ]}
      />
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-burgundy">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" className="w-full bg-transparent text-sm outline-none" />
          </label>
        </form>
        <Button size="sm" onClick={() => void save()} loading={saving} disabled={!dirty.length}>
          Save {dirty.length ? `${dirty.length} change${dirty.length > 1 ? "s" : ""}` : "changes"}
        </Button>
      </div>
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.data.length ? (
        <EmptyState icon={Boxes} title={tab === "all" ? "No products yet" : "Nothing running low"} text={tab !== "all" ? "Great — every product has healthy stock." : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Product</th>
                <th className="px-4 py-2.5 font-semibold">Stock</th>
                <th className="px-4 py-2.5 font-semibold">Price (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((p) => {
                const e = edits[p.id] ?? {};
                const hasOptions = (p.variants?.length ?? 0) > 0;
                return (
                  <tr key={p.id} className={e.stock !== undefined || e.price !== undefined ? "bg-amber-50/60" : ""}>
                    <td className="px-4 py-2.5">
                      <Link href={`/vendor/products/${p.id}`} className="font-medium hover:text-burgundy">
                        {p.name}
                      </Link>
                      {p.sku && <span className="block text-muted">SKU {p.sku}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {hasOptions ? (
                        <span className="text-muted">
                          {p.stock} across {p.variants!.length} options ·{" "}
                          <Link href={`/vendor/products/${p.id}`} className="font-semibold text-crimson">
                            edit options
                          </Link>
                        </span>
                      ) : (
                        <input
                          inputMode="numeric"
                          value={e.stock ?? String(p.stock)}
                          onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, stock: ev.target.value.replace(/\D/g, "") } })}
                          className="h-9 w-24 rounded-md border border-border px-2 outline-none focus:border-burgundy"
                          aria-label={`Stock for ${p.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        inputMode="decimal"
                        value={e.price ?? String(Number(p.price))}
                        onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, price: ev.target.value.replace(/[^\d.]/g, "") } })}
                        className="h-9 w-32 rounded-md border border-border px-2 outline-none focus:border-burgundy"
                        aria-label={`Price for ${p.name}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
