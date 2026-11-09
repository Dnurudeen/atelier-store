"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [rate, setRate] = useState("10");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ data: { commission_rate: number } }>("/admin/settings")
      .then((res) => setRate(String(res.data.commission_rate)))
      .catch((err) => setError(err?.message || "Unable to load settings"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: { commission_rate: Number(rate) },
      });
      setMessage("Commission rate updated.");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-2xl">Platform settings</h2>
      <Input
        label="Commission rate (%)"
        type="number"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        required
      />
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-crimson">{error}</p>}
      <Button type="submit" loading={saving}>
        Save
      </Button>
    </form>
  );
}
