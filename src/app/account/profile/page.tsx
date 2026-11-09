"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";

export default function AccountProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ data: { id: number; name: string; email: string; phone?: string | null; avatar?: string | null; roles?: string[] } }>(
        "/account/profile",
        {
          method: "PUT",
          body: { name, phone },
        }
      );
      if (token) {
        setSession(
          {
            ...res.data,
            roles: res.data.roles || user?.roles || ["customer"],
            store: user?.store,
          },
          token
        );
      }
      setMessage("Profile updated.");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-2xl">Profile</h2>
      <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="Email" value={user?.email || ""} disabled />
      <Input label="Phone" value={phone || ""} onChange={(e) => setPhone(e.target.value)} />
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-crimson">{error}</p>}
      <Button type="submit" loading={saving}>
        Save changes
      </Button>
    </form>
  );
}
