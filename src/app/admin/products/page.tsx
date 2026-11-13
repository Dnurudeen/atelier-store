"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import type { Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

const REJECT_REASONS = [
  "Photos are unclear or have watermarks",
  "Product name or description is misleading",
  "Price looks incorrect",
  "Item is prohibited on Atelier",
  "Wrong category",
];

function Preview({ id, onClose, onReject }: { id: number; onClose: () => void; onReject: (p: Product) => void }) {
  const { data } = useAdmin<{ data: Product }>(`/products/${id}`);
  const action = useAdminAction();
  const p = data?.data;

  return (
    <Modal
      open
      onClose={onClose}
      title="Review product"
      size="lg"
      footer={
        p && (
          <>
            <Button variant="outline" className="border-crimson text-crimson" onClick={() => onReject(p)}>
              Reject
            </Button>
            {p.status !== "published" && (
              <Button loading={action.isPending} onClick={() => action.mutate({ path: `/products/${p.id}`, body: { status: "published" }, success: "Product published" }, { onSuccess: onClose })}>
                Approve & publish
              </Button>
            )}
          </>
        )
      }
    >
      {!p ? (
        <div className="skeleton h-60 rounded-md" />
      ) : (
        <div className="space-y-3 text-[13px]">
          <div className="flex gap-2 overflow-x-auto">
            {(p.images ?? []).map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                <AppImage src={img.url} alt="" fill sizes="112px" frameClassName="absolute inset-0" />
              </a>
            ))}
            {!p.images?.length && <p className="text-crimson">No photos</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{p.name}</p>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-muted">
            {p.store?.name} · {p.category?.parent ? `${p.category.parent.name} › ` : ""}
            {p.category?.name} · {p.brand?.name ?? "No brand"} · {p.condition}
          </p>
          <p>
            <span className="text-lg font-bold">{formatNaira(p.price)}</span>
            {p.compare_at_price && <span className="ml-2 text-muted line-through">{formatNaira(p.compare_at_price)}</span>}
            <span className="ml-3 text-muted">Stock {p.stock}</span>
            {p.variants?.length ? <span className="ml-2 text-muted">· {p.variants.length} options</span> : null}
          </p>
          <p className="max-h-48 overflow-y-auto rounded-md bg-surface p-3 whitespace-pre-line">{p.description || <span className="text-crimson">No description</span>}</p>
          {p.spec_list && p.spec_list.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {p.spec_list.map((s) => (
                <div key={s.label} className="contents">
                  <dt className="text-muted">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </Modal>
  );
}

function ProductsInner() {
  const params = useSearchParams();
  const t = useTableState(params.get("status") ?? "pending");
  const [initialQ] = useState(params.get("q") ?? "");
  const store = params.get("store") ?? "";
  const { data, isFetching } = useAdmin<Page<Product>>(`/products${qs({ status: t.tab === "all" ? "" : t.tab, q: t.query || initialQ, store, page: t.page })}`);
  const action = useAdminAction();
  const [preview, setPreview] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Product | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);
  const c = data?.meta.counts ?? {};

  return (
    <>
      <AdminTable<Product>
        tabs={[
          { value: "pending", label: "To review", count: c.pending ?? 0 },
          { value: "published", label: "Live", count: c.published ?? 0 },
          { value: "rejected", label: "Rejected", count: c.rejected ?? 0 },
          { value: "draft", label: "Drafts", count: c.draft ?? 0 },
          { value: "all", label: "All" },
        ]}
        tab={t.tab}
        onTab={t.onTab}
        onSearch={t.onSearch}
        searchPlaceholder="Search product name or SKU"
        rows={data?.data}
        meta={data?.meta}
        loading={isFetching}
        page={t.page}
        onPage={t.setPage}
        empty={t.tab === "pending" ? "No products waiting for review" : "No products"}
        columns={[
          {
            key: "product",
            label: "Product",
            render: (p) => (
              <button type="button" onClick={() => setPreview(p.id)} className="flex items-center gap-3 text-left">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface">
                  <AppImage src={p.images?.[0]?.url} alt="" fill sizes="48px" frameClassName="absolute inset-0" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 max-w-[260px] font-medium hover:text-burgundy">{p.name}</span>
                  <span className="text-muted">{p.category?.name}</span>
                  {p.rejection_reason && <span className="block text-[12px] text-crimson">{p.rejection_reason}</span>}
                </span>
              </button>
            ),
          },
          { key: "store", label: "Seller", render: (p) => (p.store ? <Link href={`/admin/vendors/${p.store.id}`} className="hover:text-burgundy">{p.store.name}</Link> : "—") },
          { key: "price", label: "Price", render: (p) => formatNaira(p.price) },
          { key: "stock", label: "Stock", render: (p) => p.stock },
          { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
          {
            key: "featured",
            label: "Featured",
            render: (p) => (
              <button
                type="button"
                onClick={() => action.mutate({ path: `/products/${p.id}`, body: { is_featured: !p.is_featured }, success: p.is_featured ? "Removed from featured" : "Featured on the home page" })}
                aria-pressed={Boolean(p.is_featured)}
                aria-label={p.is_featured ? "Unfeature" : "Feature"}
                className="rounded p-1 hover:bg-surface"
              >
                <Star size={17} className={p.is_featured ? "fill-crimson text-crimson" : "text-muted"} />
              </button>
            ),
          },
          {
            key: "actions",
            label: "",
            className: "text-right whitespace-nowrap",
            render: (p) => (
              <span className="inline-flex gap-1.5">
                {p.status === "published" && (
                  <Link href={`/product/${p.slug}`} target="_blank" className="rounded-md p-1.5 text-muted hover:text-burgundy" aria-label="View on store">
                    <ExternalLink size={15} />
                  </Link>
                )}
                {p.status === "pending" && (
                  <Button size="sm" onClick={() => action.mutate({ path: `/products/${p.id}`, body: { status: "published" }, success: "Product published" })}>
                    Approve
                  </Button>
                )}
                {p.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>
                    Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-crimson" onClick={() => setDeleting(p)}>
                  Remove
                </Button>
              </span>
            ),
          },
        ]}
      />

      {preview && (
        <Preview
          id={preview}
          onClose={() => setPreview(null)}
          onReject={(p) => {
            setPreview(null);
            setRejecting(p);
          }}
        />
      )}

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject product"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Back
            </Button>
            <Button
              loading={action.isPending}
              disabled={reason.trim().length < 3}
              onClick={() =>
                action.mutate(
                  { path: `/products/${rejecting!.id}`, body: { status: "rejected", reason }, success: "Product rejected — seller notified" },
                  { onSuccess: () => { setRejecting(null); setReason(""); } }
                )
              }
            >
              Reject
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm">“{rejecting?.name}”</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-border px-2.5 py-1 text-[12px] hover:border-burgundy">
              {r}
            </button>
          ))}
        </div>
        <Textarea label="Reason (shown to the seller)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={255} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this product?"
        message={<>“{deleting?.name}” will be removed from the marketplace. Past orders are not affected.</>}
        confirmLabel="Remove"
        loading={action.isPending}
        onConfirm={() => action.mutate({ path: `/products/${deleting!.id}`, method: "DELETE" }, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsInner />
    </Suspense>
  );
}
