"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Order, User } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type Row = User & { role?: string; orders_count: number; total_spent: string | null; last_login_at?: string | null };
type Detail = User & { orders_count: number; total_spent: number; last_login_at?: string | null; recent_orders: Order[] };

function UserModal({ id, onClose }: { id: number; onClose: () => void }) {
  const me = useAuthStore((s) => s.user);
  const { data } = useAdmin<{ data: Detail }>(`/users/${id}`);
  const action = useAdminAction();
  const [reason, setReason] = useState("");
  const u = data?.data;
  const role = u?.roles?.[0];

  return (
    <Modal open onClose={onClose} title={u?.name ?? "Customer"} size="lg">
      {!u ? (
        <div className="skeleton h-40 rounded-md" />
      ) : (
        <div className="space-y-4 text-[13px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-muted">Email</p>
              <p className="font-medium">{u.email}</p>
              <p>{u.email_verified ? "Verified" : <span className="text-amber-700">Not verified</span>}</p>
            </div>
            <div>
              <p className="text-muted">Phone</p>
              <p className="font-medium">{u.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted">Joined / last sign-in</p>
              <p className="font-medium">{formatDate(u.created_at)}</p>
              <p>{u.last_login_at ? formatDate(u.last_login_at, true) : "never"}</p>
            </div>
            <div>
              <p className="text-muted">Orders</p>
              <p className="font-medium">{u.orders_count}</p>
            </div>
            <div>
              <p className="text-muted">Total spent</p>
              <p className="font-medium">{formatNaira(u.total_spent)}</p>
            </div>
            <div>
              <p className="text-muted">Role / status</p>
              <p className="flex gap-2">
                <StatusBadge status="active" label={role} /> <StatusBadge status={u.status ?? "active"} />
              </p>
            </div>
          </div>

          {u.recent_orders.length > 0 && (
            <div className="rounded-md border border-border">
              {u.recent_orders.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0 hover:bg-surface">
                  <span>{o.order_number} · {formatDate(o.created_at)}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={o.payment_status === "paid" ? o.status : o.payment_status} /> {formatNaira(o.total)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {me?.id !== u.id && u.status !== "deleted" && (
            <div className="space-y-2 rounded-md bg-surface p-3">
              <Textarea label="Note for the audit log (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={255} />
              <div className="flex flex-wrap gap-2">
                {u.status === "suspended" ? (
                  <Button size="sm" loading={action.isPending} onClick={() => action.mutate({ path: `/users/${u.id}`, body: { status: "active", reason }, success: "Account restored" })}>
                    Restore account
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-crimson text-crimson" loading={action.isPending} onClick={() => action.mutate({ path: `/users/${u.id}`, body: { status: "suspended", reason }, success: "Account suspended and signed out" })}>
                    Suspend account
                  </Button>
                )}
                {role !== "admin" ? (
                  <Button size="sm" variant="outline" loading={action.isPending} onClick={() => action.mutate({ path: `/users/${u.id}`, body: { role: "admin", reason }, success: "Promoted to admin" })}>
                    Make admin
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" loading={action.isPending} onClick={() => action.mutate({ path: `/users/${u.id}`, body: { role: u.store ? "vendor" : "customer", reason }, success: "Admin access removed" })}>
                    Remove admin access
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminUsersPage() {
  const t = useTableState("customer");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const { data, isFetching } = useAdmin<Page<Row>>(`/users${qs({ role: t.tab === "all" ? "" : t.tab, status, q: t.query, page: t.page })}`);

  return (
    <>
      <AdminTable<Row>
        tabs={[
          { value: "customer", label: "Customers" },
          { value: "vendor", label: "Sellers" },
          { value: "admin", label: "Admins" },
          { value: "all", label: "All" },
        ]}
        tab={t.tab}
        onTab={t.onTab}
        onSearch={t.onSearch}
        searchPlaceholder="Search name, email or phone"
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-border px-2 text-[13px]" aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Closed</option>
          </select>
        }
        rows={data?.data}
        meta={data?.meta}
        loading={isFetching}
        page={t.page}
        onPage={t.setPage}
        empty="No users match"
        columns={[
          { key: "name", label: "Name", render: (u) => <button type="button" onClick={() => setOpen(u.id)} className="text-left font-semibold hover:text-burgundy">{u.name}<span className="block font-normal text-muted">{u.email}</span></button> },
          { key: "phone", label: "Phone", render: (u) => u.phone ?? "—" },
          { key: "orders", label: "Orders", render: (u) => u.orders_count },
          { key: "spent", label: "Spent", render: (u) => formatNaira(u.total_spent ?? 0) },
          { key: "joined", label: "Joined", render: (u) => formatDate(u.created_at) },
          { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status ?? "active"} label={u.status === "deleted" ? "Closed" : undefined} /> },
        ]}
      />
      {open && <UserModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
