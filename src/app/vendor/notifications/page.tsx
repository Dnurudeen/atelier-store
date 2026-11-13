"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { api, type InboxMessage } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";
import { cn } from "@/lib/utils";

export default function VendorNotificationsPage() {
  const client = useQueryClient();
  const { data, isLoading } = useAccountList<InboxMessage[]>("inbox", "/account/inbox");
  const unread = Number(data?.meta?.unread ?? 0);

  async function markAll() {
    await api("/account/inbox/read", { method: "POST" });
    void client.invalidateQueries({ queryKey: ["inbox"] });
    void client.invalidateQueries({ queryKey: ["account-overview"] });
  }

  return (
    <Panel
      title={`Notifications${unread ? ` (${unread} new)` : ""}`}
      action={
        unread > 0 && (
          <button type="button" onClick={() => void markAll()} className="text-[13px] font-semibold text-crimson">
            Mark all as read
          </button>
        )
      }
    >
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.data.length ? (
        <EmptyState icon={Bell} title="No notifications yet" text="New orders, returns, reviews and store updates appear here." />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((m) => {
            const body = (
              <div className={cn("px-4 py-3 text-[13px]", !m.read_at && "bg-crimson/[0.04]")}>
                <p className="font-semibold">{m.title}</p>
                {m.body && <p className="text-foreground/80">{m.body}</p>}
                <p className="text-[12px] text-muted">{formatDate(m.created_at, true)}</p>
              </div>
            );
            return <li key={m.id}>{m.link ? <Link href={m.link} className="block hover:bg-surface">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </Panel>
  );
}
