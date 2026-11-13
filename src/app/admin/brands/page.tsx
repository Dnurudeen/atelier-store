"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import type { Brand } from "@/lib/api";

type Row = Brand & { is_active: boolean; products_count: number };

export default function AdminBrandsPage() {
  const t = useTableState();
  const { data, isFetching } = useAdmin<Page<Row>>(`/brands${qs({ q: t.query, page: t.page })}`);
  const action = useAdminAction();
  const [editing, setEditing] = useState<{ id?: number; name: string } | null>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    action.mutate(
      editing.id ? { path: `/brands/${editing.id}`, body: { name: editing.name }, success: "Brand renamed" } : { path: "/brands", method: "POST", body: { name: editing.name }, success: "Brand added" },
      { onSuccess: () => setEditing(null) }
    );
  }

  return (
    <>
      <AdminTable<Row>
        title="Brands"
        action={
          <Button size="sm" onClick={() => setEditing({ name: "" })}>
            <Plus size={15} /> Add brand
          </Button>
        }
        onSearch={t.onSearch}
        searchPlaceholder="Search brands"
        rows={data?.data}
        meta={data?.meta}
        loading={isFetching}
        page={t.page}
        onPage={t.setPage}
        minWidth={560}
        empty="No brands yet — sellers create them when they list products."
        columns={[
          { key: "name", label: "Brand", render: (b) => <span className="font-semibold">{b.name}<span className="ml-2 font-normal text-muted">/{b.slug}</span></span> },
          { key: "products", label: "Products", render: (b) => b.products_count },
          { key: "status", label: "Visible", render: (b) => <StatusBadge status={b.is_active ? "active" : "paused"} label={b.is_active ? "Visible" : "Hidden"} /> },
          {
            key: "act",
            label: "",
            className: "text-right whitespace-nowrap",
            render: (b) => (
              <span className="inline-flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditing({ id: b.id, name: b.name })}>
                  Rename
                </Button>
                <Button size="sm" variant="outline" onClick={() => action.mutate({ path: `/brands/${b.id}`, body: { is_active: !b.is_active }, success: b.is_active ? "Brand hidden from filters" : "Brand visible" })}>
                  {b.is_active ? "Hide" : "Show"}
                </Button>
                {b.products_count === 0 && (
                  <Button size="sm" variant="ghost" className="text-crimson" onClick={() => action.mutate({ path: `/brands/${b.id}`, method: "DELETE" })}>
                    Delete
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Rename brand" : "Add brand"} size="sm">
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <Input label="Brand name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required maxLength={120} autoFocus />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={action.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
