"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Download, MoreHorizontal, Package, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, getToken, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Tab = "all" | "published" | "pending" | "draft" | "rejected" | "low_stock" | "out_of_stock";
type Counts = Record<Tab, number>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function ProductsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>((params.get("status") as Tab) || "all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useVendorQuery<{ data: Product[]; meta: { current_page: number; last_page: number; total: number; counts: Counts } }>(
    "vendor-products",
    `/vendor/products?status=${tab === "all" ? "" : tab}&q=${encodeURIComponent(query)}&page=${page}`
  );
  const counts = data?.meta.counts;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["vendor-products"] });
    void client.invalidateQueries({ queryKey: ["vendor-overview"] });
  };

  async function duplicate(p: Product) {
    try {
      const res = await api<{ data: Product }>(`/vendor/products/${p.id}/duplicate`, { method: "POST" });
      toast.success("Copied as a draft");
      router.push(`/vendor/products/${res.data.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/vendor/products/${deleting.id}`, { method: "DELETE" });
      toast.success("Product deleted");
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`${API_URL}/vendor/products/export`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw { message: "Export failed" };
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => void exportCsv()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold hover:border-burgundy">
          <Download size={15} /> Export CSV
        </button>
        <Link href="/vendor/products/new" className="inline-flex items-center gap-1.5 rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-hover">
          <PlusCircle size={16} /> Add a product
        </Link>
      </div>

      <Panel>
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          tabs={[
            { value: "all", label: "All", count: counts?.all },
            { value: "published", label: "Live", count: counts?.published },
            { value: "pending", label: "In review", count: counts?.pending },
            { value: "draft", label: "Drafts", count: counts?.draft },
            { value: "rejected", label: "Rejected", count: counts?.rejected },
            { value: "low_stock", label: "Low stock", count: counts?.low_stock },
            { value: "out_of_stock", label: "Sold out", count: counts?.out_of_stock },
          ]}
        />
        <form
          className="flex gap-2 border-b border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
            setPage(1);
          }}
        >
          <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-burgundy">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <button className="h-9 rounded-md bg-burgundy px-4 text-sm font-semibold text-white">Search</button>
        </form>

        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : !data?.data.length ? (
          <EmptyState icon={Package} title={tab === "all" && !query ? "You haven't added any products yet" : "No products match"} action={tab === "all" ? { label: "Add your first product", href: "/vendor/products/new" } : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 font-semibold">Price</th>
                  <th className="px-4 py-2.5 font-semibold">Stock</th>
                  <th className="px-4 py-2.5 font-semibold">Sold</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link href={`/vendor/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface">
                          <AppImage src={p.images?.[0]?.url} alt="" fill sizes="48px" frameClassName="absolute inset-0" />
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium hover:text-burgundy">{p.name}</span>
                          <span className="text-muted">{[p.sku && `SKU ${p.sku}`, p.category?.name].filter(Boolean).join(" · ")}</span>
                          {p.status === "rejected" && p.rejection_reason && <span className="block text-[12px] text-crimson">{p.rejection_reason}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{formatNaira(p.price)}</span>
                      {p.compare_at_price && <span className="block text-muted line-through">{formatNaira(p.compare_at_price)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.stock <= 0 ? "font-semibold text-crimson" : p.stock <= (p.low_stock_threshold ?? 5) ? "font-semibold text-amber-700" : ""}>{p.stock}</span>
                      {(p.variants?.length ?? 0) > 0 && <span className="block text-muted">{p.variants!.length} options</span>}
                    </td>
                    <td className="px-4 py-3">{p.sold_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <button type="button" onClick={() => setMenu(menu === p.id ? null : p.id)} className="rounded-md p-1.5 hover:bg-surface" aria-label={`Actions for ${p.name}`} aria-expanded={menu === p.id}>
                        <MoreHorizontal size={18} />
                      </button>
                      {menu === p.id && (
                        <div className="absolute top-10 right-4 z-20 w-44 overflow-hidden rounded-md border border-border bg-white py-1 text-left shadow-xl" onMouseLeave={() => setMenu(null)}>
                          <Link href={`/vendor/products/${p.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-surface">
                            <Pencil size={14} /> Edit
                          </Link>
                          {p.status === "published" && (
                            <Link href={`/product/${p.slug}`} target="_blank" className="flex items-center gap-2 px-3 py-2 hover:bg-surface">
                              <Package size={14} /> View on store
                            </Link>
                          )}
                          <button type="button" onClick={() => void duplicate(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface">
                            <Copy size={14} /> Duplicate
                          </button>
                          <button type="button" onClick={() => { setDeleting(p); setMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-crimson hover:bg-crimson/5">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-border p-3 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <span className="text-muted">
              Page {data.meta.current_page} of {data.meta.last_page}
            </span>
            <button disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this product?"
        message={<>“{deleting?.name}” will be removed from your store and any active sponsorship paused. Past orders are not affected.</>}
        confirmLabel="Delete"
        loading={busy}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

export default function VendorProductsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProductsInner />
    </Suspense>
  );
}
