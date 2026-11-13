"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Package, RotateCcw, Star } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { api, type InboxMessage } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = { order: Package, return: RotateCcw, review: Star };

export default function InboxPage() {
  const client = useQueryClient();
  const { data, isLoading } = useAccountList<InboxMessage[]>("inbox", "/account/inbox");
  const messages = data?.data ?? [];
  const unread = Number(data?.meta?.unread ?? 0);

  // Opening the inbox marks everything as read (after a short delay so the highlight is visible).
  useEffect(() => {
    if (!unread) return;
    const id = window.setTimeout(() => {
      void api("/account/inbox/read", { method: "POST" }).then(() => {
        void client.invalidateQueries({ queryKey: ["account-overview"] });
      });
    }, 1500);
    return () => window.clearTimeout(id);
  }, [unread, client]);

  return (
    <AccountCard title={`Inbox${unread ? ` (${unread} new)` : ""}`}>
      {isLoading ? (
        <ListSkeleton />
      ) : messages.length === 0 ? (
        <EmptyState icon={Bell} title="You don't have any messages" text="Here you'll find updates about your orders, returns and account." action={{ label: "Continue shopping", href: "/shop" }} />
      ) : (
        <ul className="divide-y divide-border">
          {messages.map((m) => {
            const Icon = ICONS[m.type] ?? Bell;
            const body = (
              <div className={cn("flex gap-3 px-4 py-3", !m.read_at && "bg-crimson/[0.04]")}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-warm text-burgundy">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="flex items-center gap-2 font-semibold">
                    {m.title} {!m.read_at && <span className="h-2 w-2 rounded-full bg-crimson" aria-label="Unread" />}
                  </p>
                  {m.body && <p className="text-foreground/80">{m.body}</p>}
                  <p className="mt-0.5 text-[12px] text-muted">{formatDate(m.created_at, true)}</p>
                </div>
              </div>
            );
            return <li key={m.id}>{m.link ? <Link href={m.link} className="block hover:bg-surface">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </AccountCard>
  );
}
