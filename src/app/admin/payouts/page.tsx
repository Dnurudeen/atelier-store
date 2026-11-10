"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Payout = {
  id: number;
  amount: number | string;
  commission: number | string;
  status: string;
  store?: { name?: string };
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ data: Payout[] }>("/admin/payouts");
    setPayouts(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load payouts"));
  }, []);

  async function closeWeek() {
    setError("");
    await api("/admin/statements/close", { method: "POST" });
    await load();
  }

  async function markPaid(id: number) {
    await api(`/admin/payouts/${id}`, {
      method: "PUT",
      body: { status: "paid", reference: `PAY-${id}` },
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Payouts</h2>
          <p className="text-sm text-muted">Close the week to turn each store&apos;s pending delivered balance into one payout.</p>
        </div>
        <Button variant="outline" onClick={() => void closeWeek()}>
          Close this week
        </Button>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="space-y-3">
        {payouts.map((payout) => (
          <div
            key={payout.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
          >
            <div>
              <p className="font-medium">{payout.store?.name || `Payout #${payout.id}`}</p>
              <p className="text-sm text-muted capitalize">
                {payout.status} · commission {formatNaira(payout.commission)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-burgundy">{formatNaira(payout.amount)}</span>
              {payout.status !== "paid" && (
                <Button size="sm" onClick={() => void markPaid(payout.id)}>
                  Mark paid
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
