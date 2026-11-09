"use client";

import { useEffect, useState } from "react";
import { api, type Store } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Store[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ data: Store[] }>("/admin/vendors");
    setVendors(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load vendors"));
  }, []);

  async function updateStatus(id: number, status: "approved" | "rejected" | "suspended") {
    await api(`/admin/vendors/${id}`, { method: "PUT", body: { status } });
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Vendors</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="space-y-3">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
          >
            <div>
              <p className="font-medium">{vendor.name}</p>
              <p className="text-sm text-muted">
                {vendor.user?.email || vendor.location || "—"} · {vendor.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void updateStatus(vendor.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => void updateStatus(vendor.id, "rejected")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
