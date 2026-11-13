"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Category, Store, Voucher } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { voucherHeadline } from "@/lib/vouchers";

type Draft = {
  id?: number;
  code: string;
  description: string;
  type: Voucher["type"];
  value: string;
  min_order: string;
  max_discount: string;
  usage_limit: string;
  per_user_limit: string;
  store_id: string;
  category_id: string;
  first_order_only: boolean;
  is_public: boolean;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const blank: Draft = { code: "", description: "", type: "percent", value: "10", min_order: "", max_discount: "", usage_limit: "", per_user_limit: "1", store_id: "", category_id: "", first_order_only: false, is_public: true, is_active: true, starts_at: "", ends_at: "" };
const local = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const sel = "h-11 w-full rounded-md border border-border bg-white px-3 text-sm";

export default function AdminVouchersPage() {
  const t = useTableState();
  const { data, isFetching } = useAdmin<Page<Voucher>>(`/coupons${qs({ q: t.query, page: t.page })}`);
  const stores = useAdmin<Page<Store>>("/vendors?status=approved&per_page=100");
  const cats = useAdmin<{ data: Category[] }>("/categories");
  const action = useAdminAction();
  const [d, setD] = useState<Draft | null>(null);

  function edit(v: Voucher) {
    setD({
      id: v.id,
      code: v.code,
      description: v.description ?? "",
      type: v.type,
      value: String(Number(v.value)),
      min_order: v.min_order ? String(Number(v.min_order)) : "",
      max_discount: v.max_discount ? String(Number(v.max_discount)) : "",
      usage_limit: v.usage_limit ? String(v.usage_limit) : "",
      per_user_limit: String(v.per_user_limit ?? 1),
      store_id: v.store_id ? String(v.store_id) : "",
      category_id: v.category_id ? String(v.category_id) : "",
      first_order_only: Boolean(v.first_order_only),
      is_public: v.is_public !== false,
      is_active: v.is_active,
      starts_at: local(v.starts_at),
      ends_at: local(v.ends_at),
    });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!d) return;
    const n = (v: string) => (v === "" ? null : Number(v));
    const body = {
      code: d.code,
      description: d.description || null,
      type: d.type,
      value: d.type === "free_shipping" ? 0 : Number(d.value),
      min_order: n(d.min_order),
      max_discount: d.type === "percent" ? n(d.max_discount) : null,
      usage_limit: n(d.usage_limit),
      per_user_limit: Number(d.per_user_limit || 1),
      store_id: n(d.store_id),
      category_id: n(d.category_id),
      first_order_only: d.first_order_only,
      is_public: d.is_public,
      is_active: d.is_active,
      starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : null,
      ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
    };
    action.mutate(d.id ? { path: `/coupons/${d.id}`, body, success: "Voucher saved" } : { path: "/coupons", method: "POST", body, success: "Voucher created" }, { onSuccess: () => setD(null) });
  }

  const status = (v: Voucher) => {
    if (!v.is_active) return <StatusBadge status="paused" label="Off" />;
    if (v.ends_at && new Date(v.ends_at) < new Date()) return <StatusBadge status="expired" />;
    if (v.usage_limit && (v.used_count ?? 0) >= v.usage_limit) return <StatusBadge status="exhausted" label="Used up" />;
    return <StatusBadge status="active" />;
  };

  return (
    <>
      <AdminTable<Voucher>
        title="Vouchers"
        action={
          <Button size="sm" onClick={() => setD({ ...blank })}>
            <Plus size={15} /> New voucher
          </Button>
        }
        onSearch={t.onSearch}
        searchPlaceholder="Search code"
        rows={data?.data}
        meta={data?.meta}
        loading={isFetching}
        page={t.page}
        onPage={t.setPage}
        empty="No vouchers yet"
        columns={[
          { key: "code", label: "Code", render: (v) => <button type="button" onClick={() => edit(v)} className="font-mono font-bold hover:text-burgundy">{v.code}<span className="block font-sans font-normal text-muted">{v.description}</span></button> },
          { key: "offer", label: "Offer", render: (v) => <span>{voucherHeadline(v)}{v.min_order && <span className="block text-muted">min {formatNaira(v.min_order)}</span>}</span> },
          { key: "scope", label: "Applies to", render: (v) => [v.store?.name, v.category?.name, v.first_order_only && "first order", !v.is_public && "hidden code"].filter(Boolean).join(" · ") || "Everything" },
          { key: "used", label: "Used", render: (v) => `${v.used_count ?? 0}${v.usage_limit ? ` / ${v.usage_limit}` : ""}` },
          { key: "dates", label: "Valid", render: (v) => <span className="text-muted">{v.starts_at ? formatDate(v.starts_at) : "now"} → {v.ends_at ? formatDate(v.ends_at) : "no end"}</span> },
          { key: "status", label: "Status", render: status },
          { key: "act", label: "", className: "text-right whitespace-nowrap", render: (v) => <Button size="sm" variant="outline" onClick={() => action.mutate({ path: `/coupons/${v.id}`, body: { is_active: !v.is_active }, success: v.is_active ? "Voucher turned off" : "Voucher turned on" })}>{v.is_active ? "Turn off" : "Turn on"}</Button> },
        ]}
      />

      <Modal open={Boolean(d)} onClose={() => setD(null)} title={d?.id ? "Edit voucher" : "New voucher"} size="lg">
        {d && (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Input label="Code" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required maxLength={40} hint="Letters, numbers, - and _" />
            <Input label="Description (shown to customers)" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={255} />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground/80">Type</label>
              <select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as Voucher["type"] })} className={sel}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_shipping">Free delivery</option>
              </select>
            </div>
            {d.type !== "free_shipping" ? (
              <Input label={d.type === "percent" ? "Percent off" : "Amount off (₦)"} inputMode="decimal" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value.replace(/[^\d.]/g, "") })} required />
            ) : (
              <div />
            )}
            <Input label="Minimum spend (₦)" inputMode="decimal" value={d.min_order} onChange={(e) => setD({ ...d, min_order: e.target.value.replace(/[^\d.]/g, "") })} />
            {d.type === "percent" ? <Input label="Maximum discount (₦)" inputMode="decimal" value={d.max_discount} onChange={(e) => setD({ ...d, max_discount: e.target.value.replace(/[^\d.]/g, "") })} /> : <div />}
            <Input label="Total uses allowed" inputMode="numeric" value={d.usage_limit} onChange={(e) => setD({ ...d, usage_limit: e.target.value.replace(/\D/g, "") })} hint="Empty = unlimited" />
            <Input label="Uses per customer" inputMode="numeric" value={d.per_user_limit} onChange={(e) => setD({ ...d, per_user_limit: e.target.value.replace(/\D/g, "") })} />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground/80">Only for seller</label>
              <select value={d.store_id} onChange={(e) => setD({ ...d, store_id: e.target.value })} className={sel}>
                <option value="">All sellers</option>
                {(stores.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground/80">Only for category</label>
              <select value={d.category_id} onChange={(e) => setD({ ...d, category_id: e.target.value })} className={sel}>
                <option value="">All categories</option>
                {(cats.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? "— " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Starts" type="datetime-local" value={d.starts_at} onChange={(e) => setD({ ...d, starts_at: e.target.value })} />
            <Input label="Ends" type="datetime-local" value={d.ends_at} onChange={(e) => setD({ ...d, ends_at: e.target.value })} />
            <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
              {(
                [
                  ["first_order_only", "First order only"],
                  ["is_public", "Show in customers' Vouchers page"],
                  ["is_active", "Active"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.checked })} className="h-4 w-4 accent-[var(--crimson)]" />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[12px] text-muted sm:col-span-2">Vouchers are funded by Atelier: sellers still receive their full earnings.</p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setD(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={action.isPending}>
                Save voucher
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
