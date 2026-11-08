"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";

export default function AccountProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "Ada Customer",
    email: user?.email ?? "customer@atelier.ng",
    phone: "+234 801 234 5678",
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Profile</h2>
        <p className="mt-1 text-sm text-muted">Your account details for orders and receipts.</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
      >
        <Input
          label="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input label="New password" type="password" placeholder="Leave blank to keep current" />
        {saved ? <p className="text-sm text-emerald-700">Profile updated (demo).</p> : null}
        <Button type="submit">Save changes</Button>
      </form>
    </div>
  );
}
