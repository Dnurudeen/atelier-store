"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronRight, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin, useAdminAction } from "@/lib/admin";
import type { Category } from "@/lib/api";
import { media } from "@/lib/media";

type Row = Category & { products_count: number; children_count: number };
type Draft = { id?: number; name: string; parent_id: string; description: string; image: string[]; sort_order: string; is_active: boolean };

const blank: Draft = { name: "", parent_id: "", description: "", image: [], sort_order: "", is_active: true };

export default function AdminCategoriesPage() {
  const { data, isLoading } = useAdmin<{ data: Row[] }>("/categories");
  const action = useAdminAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const tops = rows.filter((c) => !c.parent_id);
  const childrenOf = (id: number) => rows.filter((c) => c.parent_id === id);

  function edit(c: Row) {
    setDraft({ id: c.id, name: c.name, parent_id: c.parent_id ? String(c.parent_id) : "", description: c.description ?? "", image: c.image ? [c.image] : [], sort_order: String(c.sort_order ?? ""), is_active: c.is_active !== false });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const body = {
      name: draft.name.trim(),
      parent_id: draft.parent_id ? Number(draft.parent_id) : null,
      description: draft.description || null,
      image: draft.image[0] ?? null,
      is_active: draft.is_active,
      ...(draft.sort_order ? { sort_order: Number(draft.sort_order) } : {}),
    };
    action.mutate(
      draft.id ? { path: `/categories/${draft.id}`, body, success: "Category saved" } : { path: "/categories", method: "POST", body, success: "Category created" },
      { onSuccess: () => setDraft(null) }
    );
  }

  const line = (c: Row, child = false) => (
    <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 text-[13px] ${child ? "pl-12" : ""} ${c.is_active === false ? "opacity-60" : ""}`}>
      {child && <ChevronRight size={14} className="-ml-5 text-muted" />}
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-surface-warm">
        <AppImage src={c.image || media.category(c.slug)} alt="" fill sizes="36px" frameClassName="absolute inset-0" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={child ? "" : "font-semibold"}>{c.name}</span>
        <span className="ml-2 text-muted">/{c.slug}</span>
        {c.is_active === false && (
          <span className="ml-2 inline-flex items-center gap-1 text-muted">
            <EyeOff size={12} /> hidden
          </span>
        )}
      </span>
      <span className="text-muted">{c.products_count} products</span>
      <button type="button" onClick={() => edit(c)} className="rounded p-1.5 text-muted hover:text-burgundy" aria-label={`Edit ${c.name}`}>
        <Pencil size={15} />
      </button>
      <button type="button" onClick={() => setDeleting(c)} className="rounded p-1.5 text-muted hover:text-crimson" aria-label={`Delete ${c.name}`}>
        <Trash2 size={15} />
      </button>
    </div>
  );

  return (
    <>
      <Panel
        title="Categories"
        action={
          <Button size="sm" onClick={() => setDraft({ ...blank })}>
            <Plus size={15} /> Add category
          </Button>
        }
        bodyClassName="divide-y divide-border"
      >
        {isLoading ? (
          <ListSkeleton />
        ) : (
          tops.map((top) => (
            <div key={top.id}>
              {line(top)}
              {childrenOf(top.id).map((child) => line(child, true))}
            </div>
          ))
        )}
      </Panel>

      <Modal open={Boolean(draft)} onClose={() => setDraft(null)} title={draft?.id ? "Edit category" : "New category"}>
        {draft && (
          <form onSubmit={save} className="space-y-3">
            <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={120} />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground/80">Parent</label>
              <select value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
                <option value="">None — top-level category</option>
                {tops.filter((t) => t.id !== draft.id).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <Textarea label="Description (shown on the category page)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={1000} />
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Tile image</p>
              <ImageUploader value={draft.image} onChange={(v) => setDraft({ ...draft, image: v.slice(-1) })} purpose="category" max={1} />
            </div>
            <div className="flex items-center gap-4">
              <Input label="Position" inputMode="numeric" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value.replace(/\D/g, "") })} className="w-28" />
              <label className="mt-5 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="h-4 w-4 accent-[var(--crimson)]" />
                Visible on the store
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={action.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        message={deleting && (deleting.products_count > 0 || deleting.children_count > 0) ? "This category still has products or sub-categories. Hide it instead, or move them first." : `“${deleting?.name}” will be deleted.`}
        confirmLabel="Delete"
        loading={action.isPending}
        onConfirm={() => action.mutate({ path: `/categories/${deleting!.id}`, method: "DELETE" }, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
