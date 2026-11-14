"use client";

import { FormEvent, useState } from "react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAdmin, useAdminAction, type Page } from "@/lib/admin";

type Settings = { commission_rate: number; support_email: string | null; support_phone: string | null; announcement: string | null };

function SettingsForm({ initial }: { initial: Settings }) {
  const action = useAdminAction();
  const [form, setForm] = useState({
    commission_rate: String(initial.commission_rate),
    support_email: initial.support_email ?? "",
    support_phone: initial.support_phone ?? "",
    announcement: initial.announcement ?? "",
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    action.mutate({
      path: "/settings",
      body: {
        commission_rate: Number(form.commission_rate),
        support_email: form.support_email || null,
        support_phone: form.support_phone || null,
        announcement: form.announcement || null,
      },
      success: "Settings saved",
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-4 md:grid-cols-2">
      <Input
        label="Commission (%)"
        inputMode="decimal"
        value={form.commission_rate}
        onChange={(e) => setForm({ ...form, commission_rate: e.target.value.replace(/[^\d.]/g, "") })}
        hint="Taken from the item total of every new order (0 to 50%). Existing orders keep their rate."
      />
      <div />
      <Input label="Support email" type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
      <Input label="Support phone" value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} />
      <div className="md:col-span-2">
        <Input label="Announcement strip" value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} maxLength={160} hint="Short message for the storefront top strip, e.g. “Free delivery in Lagos this weekend”. Leave empty to hide." />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" loading={action.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdmin<{ data: Settings }>("/settings");
  const subs = useAdmin<Page<{ id: number; email: string }>>("/subscribers?per_page=1");

  return (
    <div className="space-y-3">
      <Panel title="Marketplace settings">{isLoading || !data ? <ListSkeleton rows={2} /> : <SettingsForm initial={data.data} />}</Panel>
      <Panel title="Newsletter" bodyClassName="p-4 text-sm">
        <p>
          <strong>{subs.data?.meta.total ?? 0}</strong> active newsletter subscribers (from the footer sign-up), plus customers who opted in at registration.
        </p>
      </Panel>
    </div>
  );
}
