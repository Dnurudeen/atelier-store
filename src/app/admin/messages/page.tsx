"use client";

import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";

type Message = { id: number; name: string; email: string; topic: string; order_number?: string | null; message: string; status: "open" | "closed"; created_at: string };

export default function AdminMessagesPage() {
  const t = useTableState("open");
  const { data, isFetching } = useAdmin<Page<Message>>(`/messages${qs({ status: t.tab === "all" ? "" : t.tab, page: t.page })}`);
  const action = useAdminAction();

  return (
    <AdminTable<Message>
      tabs={[
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "all", label: "All" },
      ]}
      tab={t.tab}
      onTab={t.onTab}
      rows={data?.data}
      meta={data?.meta}
      loading={isFetching}
      page={t.page}
      onPage={t.setPage}
      empty="No messages"
      columns={[
        { key: "from", label: "From", render: (m) => <span className="font-semibold">{m.name}<a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your Atelier ${m.topic} question (#${m.id})`)}`} className="block font-normal text-burgundy hover:underline">{m.email}</a></span> },
        { key: "topic", label: "Topic", render: (m) => <span className="capitalize">{m.topic}{m.order_number && <span className="block text-muted">{m.order_number}</span>}</span> },
        { key: "message", label: "Message", render: (m) => <p className="max-w-md whitespace-pre-line">{m.message}</p> },
        { key: "date", label: "Received", render: (m) => <span className="whitespace-nowrap">{formatDate(m.created_at, true)}</span> },
        { key: "status", label: "", className: "text-right", render: (m) => <span className="inline-flex items-center gap-2"><StatusBadge status={m.status === "open" ? "pending" : "resolved"} label={m.status === "open" ? "Open" : "Closed"} /><Button size="sm" variant="outline" onClick={() => action.mutate({ path: `/messages/${m.id}`, body: { status: m.status === "open" ? "closed" : "open" }, success: m.status === "open" ? "Closed" : "Reopened" })}>{m.status === "open" ? "Close" : "Reopen"}</Button></span> },
      ]}
    />
  );
}
