"use client";

import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdmin, useAdminAction } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Banner } from "@/lib/api";

type Draft = { id?: number; title: string; subtitle: string; image: string[]; cta_label: string; cta_url: string; placement: "hero" | "side" | "tile"; sort_order: string; is_active: boolean; starts_at: string; ends_at: string };

const PLACEMENTS = {
  hero: { label: "Home hero carousel", hint: "Wide image, 1600×600 px" },
  side: { label: "Beside the hero (desktop, shows when there are 2)", hint: "Portrait, 520×340 px" },
  tile: { label: "Promo tiles under the hero", hint: "Square, 400×400 px" },
} as const;

const blank: Draft = { title: "", subtitle: "", image: [], cta_label: "Shop now", cta_url: "/shop", placement: "hero", sort_order: "", is_active: true, starts_at: "", ends_at: "" };
const local = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

export default function AdminBannersPage() {
  const { data, isLoading } = useAdmin<{ data: Banner[] }>("/banners");
  const action = useAdminAction();
  const [d, setD] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    if (!d || !d.image[0]) return;
    const body = {
      title: d.title,
      subtitle: d.subtitle || null,
      image: d.image[0],
      cta_label: d.cta_label || null,
      cta_url: d.cta_url || null,
      placement: d.placement,
      is_active: d.is_active,
      starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : null,
      ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
      ...(d.sort_order ? { sort_order: Number(d.sort_order) } : {}),
    };
    action.mutate(d.id ? { path: `/banners/${d.id}`, body, success: "Banner saved" } : { path: "/banners", method: "POST", body, success: "Banner created" }, { onSuccess: () => setD(null) });
  }

  return (
    <>
      {(Object.keys(PLACEMENTS) as Draft["placement"][]).map((placement) => {
        const rows = (data?.data ?? []).filter((b) => (b.placement ?? "hero") === placement);
        return (
          <Panel
            key={placement}
            className="mb-3"
            title={PLACEMENTS[placement].label}
            action={
              <Button size="sm" onClick={() => setD({ ...blank, placement })}>
                <Plus size={15} /> Add
              </Button>
            }
            bodyClassName="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {isLoading ? (
              <ListSkeleton rows={1} />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted">{placement === "tile" ? "None — the store shows the default shortcut tiles." : "None yet."}</p>
            ) : (
              rows.map((b) => (
                <div key={b.id} className={`overflow-hidden rounded-md border border-border ${b.is_active ? "" : "opacity-60"}`}>
                  <div className={`relative bg-surface ${placement === "tile" ? "aspect-square" : "aspect-[8/3]"}`}>
                    <AppImage src={b.image} alt="" fill sizes="360px" frameClassName="absolute inset-0" />
                  </div>
                  <div className="space-y-1 p-3 text-[13px]">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-muted">
                      {b.cta_url} · #{b.sort_order}
                    </p>
                    <p className="text-muted">
                      {b.starts_at || b.ends_at ? `${b.starts_at ? formatDate(b.starts_at) : "now"} → ${b.ends_at ? formatDate(b.ends_at) : "no end"}` : "Always on"}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => action.mutate({ path: `/banners/${b.id}`, body: { is_active: !b.is_active }, success: b.is_active ? "Banner hidden" : "Banner live" })}>
                        <StatusBadge status={b.is_active ? "active" : "paused"} label={b.is_active ? "Live" : "Hidden"} />
                      </button>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Edit banner"
                          className="rounded p-1.5 text-muted hover:text-burgundy"
                          onClick={() => setD({ id: b.id, title: b.title, subtitle: b.subtitle ?? "", image: [b.image], cta_label: b.cta_label ?? "", cta_url: b.cta_url ?? "", placement, sort_order: String(b.sort_order ?? ""), is_active: b.is_active, starts_at: local(b.starts_at), ends_at: local(b.ends_at) })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button type="button" aria-label="Delete banner" className="rounded p-1.5 text-muted hover:text-crimson" onClick={() => setDeleting(b)}>
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Panel>
        );
      })}

      <Modal open={Boolean(d)} onClose={() => setD(null)} title={d?.id ? "Edit banner" : "New banner"} size="lg">
        {d && (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Image *</p>
              <ImageUploader value={d.image} onChange={(v) => setD({ ...d, image: v.slice(-1) })} purpose="banner" max={1} hint={PLACEMENTS[d.placement].hint} />
            </div>
            <Input label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required maxLength={160} />
            <Input label="Subtitle" value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} maxLength={255} />
            <Input label="Button label" value={d.cta_label} onChange={(e) => setD({ ...d, cta_label: e.target.value })} maxLength={60} />
            <Input label="Link" value={d.cta_url} onChange={(e) => setD({ ...d, cta_url: e.target.value })} hint="e.g. /category/fashion or /shop?on_sale=1" />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground/80">Placement</label>
              <select value={d.placement} onChange={(e) => setD({ ...d, placement: e.target.value as Draft["placement"] })} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
                {(Object.keys(PLACEMENTS) as Draft["placement"][]).map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENTS[p].label}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Position" inputMode="numeric" value={d.sort_order} onChange={(e) => setD({ ...d, sort_order: e.target.value.replace(/\D/g, "") })} />
            <Input label="Show from" type="datetime-local" value={d.starts_at} onChange={(e) => setD({ ...d, starts_at: e.target.value })} />
            <Input label="Show until" type="datetime-local" value={d.ends_at} onChange={(e) => setD({ ...d, ends_at: e.target.value })} />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={d.is_active} onChange={(e) => setD({ ...d, is_active: e.target.checked })} className="h-4 w-4 accent-[var(--crimson)]" />
              Live
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setD(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={action.isPending} disabled={!d.image[0]}>
                Save banner
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete banner?"
        message={`“${deleting?.title}” will be removed from the home page.`}
        confirmLabel="Delete"
        loading={action.isPending}
        onConfirm={() => action.mutate({ path: `/banners/${deleting!.id}`, method: "DELETE" }, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
