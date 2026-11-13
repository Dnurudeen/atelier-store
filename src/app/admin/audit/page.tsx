"use client";

import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { qs, useAdmin, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";

type Action = { id: number; action: string; subject_type?: string | null; subject_id?: number | null; meta?: Record<string, unknown> | null; ip?: string | null; created_at: string; user?: { name: string } };

export default function AdminAuditPage() {
  const t = useTableState();
  const { data, isFetching } = useAdmin<Page<Action>>(`/audits${qs({ action: t.query, page: t.page })}`);

  return (
    <AdminTable<Action>
      title="Audit log"
      onSearch={t.onSearch}
      searchPlaceholder="Filter by action, e.g. vendor, refund, settings"
      rows={data?.data}
      meta={data?.meta}
      loading={isFetching}
      page={t.page}
      onPage={t.setPage}
      empty="No admin actions recorded yet"
      columns={[
        { key: "when", label: "When", render: (a) => <span className="whitespace-nowrap">{formatDate(a.created_at, true)}</span> },
        { key: "who", label: "Admin", render: (a) => a.user?.name ?? "system" },
        { key: "action", label: "Action", render: (a) => <span className="font-mono text-[12px]">{a.action}</span> },
        { key: "subject", label: "Subject", render: (a) => (a.subject_type ? `${a.subject_type} #${a.subject_id}` : "—") },
        { key: "details", label: "Details", render: (a) => <code className="block max-w-sm truncate text-[11px] text-muted">{a.meta ? JSON.stringify(a.meta) : ""}</code> },
        { key: "ip", label: "IP", render: (a) => <span className="text-muted">{a.ip}</span> },
      ]}
    />
  );
}
