"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_COMMISSION_RATE } from "@/lib/demo-dashboard";

export default function AdminSettingsPage() {
  const [rate, setRate] = useState(String(DEFAULT_COMMISSION_RATE));
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="font-display text-2xl">Platform settings</h2>
        <p className="mt-1 text-sm text-muted">Fees and marketplace defaults.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <Input
          label="Commission rate (%)"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <p className="text-xs text-muted">
          Applied to vendor payouts before disbursement. Changes affect new orders only (demo).
        </p>
        {saved ? <p className="text-sm text-emerald-700">Settings saved.</p> : null}
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
