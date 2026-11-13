"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Kpi, Panel } from "@/components/layout/dashboard-shell";
import { SellerScore } from "@/components/products/seller-score";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin, useAdminAction } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Product, SellerScore as Score, Store } from "@/lib/api";
import { media } from "@/lib/media";
import { formatNaira } from "@/lib/utils";

type Detail = {
  store: Store & { live_products_count: number; followers_count: number; user?: { name: string; email: string; phone?: string; created_at: string } };
  seller_score: Score;
  sales: number;
  orders: number;
  pending_balance: number;
  recent_products: Product[];
  history: { id: number; action: string; meta?: Record<string, unknown>; created_at: string; user?: { name: string } }[];
};

const ACTIONS: Record<string, { label: string; needsReason: boolean; tone: "primary" | "outline" }> = {
  approved: { label: "Approve store", needsReason: false, tone: "primary" },
  rejected: { label: "Reject application", needsReason: true, tone: "outline" },
  suspended: { label: "Suspend store", needsReason: true, tone: "outline" },
  pending: { label: "Move back to review", needsReason: false, tone: "outline" },
};

export default function AdminVendorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdmin<{ data: Detail }>(`/vendors/${id}`);
  const action = useAdminAction();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (isLoading || !data) return <ListSkeleton rows={5} />;
  const d = data.data;
  const s = d.store;
  const available = Object.keys(ACTIONS).filter((k) => k !== s.status && !(s.status === "pending" && k === "pending"));

  return (
    <div className="space-y-3">
      <Link href="/admin/vendors" className="text-sm font-semibold text-burgundy">
        ← All sellers
      </Link>
      <Panel bodyClassName="flex flex-wrap items-center gap-4 p-4">
        <span className="relative h-16 w-16 overflow-hidden rounded-md bg-surface">
          <AppImage src={s.logo || media.makerAvatar(s.id)} alt="" fill sizes="64px" frameClassName="absolute inset-0" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {s.name} <StatusBadge status={s.status} />
          </p>
          <p className="text-[13px] text-muted">
            {s.user?.name} · {s.user?.email} {s.user?.phone ? `· ${s.user.phone}` : ""} · applied {formatDate(s.user?.created_at)}
          </p>
          {s.status_reason && <p className="text-[13px] text-crimson">Reason: {s.status_reason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "approved" && (
            <Link href={`/makers/${s.slug}`} target="_blank" className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-burgundy">
              View store
            </Link>
          )}
          {available.map((k) => (
            <Button key={k} size="sm" variant={ACTIONS[k].tone} className={ACTIONS[k].tone === "outline" && k !== "pending" ? "border-crimson text-crimson" : ""} onClick={() => setTarget(k)}>
              {ACTIONS[k].label}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sales" value={formatNaira(d.sales)} />
        <Kpi label="Paid orders" value={d.orders} />
        <Kpi label="Pending balance" value={formatNaira(d.pending_balance)} />
        <Kpi label="Products" value={`${s.live_products_count} live`} hint={`${s.products_count} total · ${s.followers_count} followers`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Store profile" bodyClassName="space-y-2 p-4 text-[13px]">
          <p><span className="text-muted">Ships from:</span> {s.location ?? "—"}</p>
          <p><span className="text-muted">Delivery fee:</span> {formatNaira(s.shipping_fee ?? 0)}</p>
          <p className="whitespace-pre-line"><span className="text-muted">About:</span> {s.bio ?? "—"}</p>
          <p>
            <span className="text-muted">Payout account:</span>{" "}
            {s.account_number ? `${s.bank_name} · ${s.account_number} · ${s.account_name}` : <span className="text-amber-700">not provided</span>}
          </p>
        </Panel>
        <Panel title="Seller performance (4 weeks)" bodyClassName="p-4">
          <SellerScore score={d.seller_score} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Recent products" action={<Link href={`/admin/products?store=${s.id}`} className="text-[13px] font-semibold text-crimson">All products</Link>} bodyClassName="divide-y divide-border">
          {d.recent_products.length === 0 ? (
            <p className="p-4 text-sm text-muted">No products yet.</p>
          ) : (
            d.recent_products.map((p) => (
              <Link key={p.id} href={`/admin/products?q=${encodeURIComponent(p.name)}`} className="flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-surface">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-surface">
                  <AppImage src={p.images?.[0]?.url} alt="" fill sizes="36px" frameClassName="absolute inset-0" />
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <StatusBadge status={p.status} />
              </Link>
            ))
          )}
        </Panel>
        <Panel title="History" bodyClassName="divide-y divide-border">
          {d.history.length === 0 ? (
            <p className="p-4 text-sm text-muted">No admin actions yet.</p>
          ) : (
            d.history.map((h) => (
              <div key={h.id} className="px-4 py-2 text-[13px]">
                <span className="font-semibold">{h.action.replace("vendor.", "")}</span> by {h.user?.name ?? "system"} · {formatDate(h.created_at, true)}
                {typeof h.meta?.reason === "string" && <span className="block text-muted">{h.meta.reason}</span>}
              </div>
            ))
          )}
        </Panel>
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? ACTIONS[target].label : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Back
            </Button>
            <Button
              loading={action.isPending}
              disabled={Boolean(target && ACTIONS[target].needsReason && reason.trim().length < 3)}
              onClick={() =>
                action.mutate(
                  { path: `/vendors/${s.id}`, body: { status: target, reason: reason || undefined }, success: "Store updated and seller notified" },
                  { onSuccess: () => { setTarget(null); setReason(""); } }
                )
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        {target === "approved" && <p className="text-sm">The seller can publish products immediately and will get an email.</p>}
        {target && ACTIONS[target].needsReason && (
          <Textarea label="Reason (sent to the seller)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={255} />
        )}
        {target === "suspended" && <p className="mt-2 text-[13px] text-muted">Their products disappear from the store and they can&apos;t fulfil new orders until restored.</p>}
      </Modal>
    </div>
  );
}
