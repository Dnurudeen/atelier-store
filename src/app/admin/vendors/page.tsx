"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { demoPendingVendors, type DemoVendorApplication } from "@/lib/demo-dashboard";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<DemoVendorApplication[]>(demoPendingVendors);

  function updateStatus(id: number, status: "approved" | "rejected") {
    setVendors((list) => list.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  const pending = vendors.filter((v) => v.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Vendor applications</h2>
        <p className="mt-1 text-sm text-muted">{pending.length} awaiting decision.</p>
      </div>
      <ul className="space-y-4">
        {vendors.map((vendor) => (
          <li
            key={vendor.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5"
          >
            <div>
              <p className="font-medium">{vendor.storeName}</p>
              <p className="text-sm text-muted">
                {vendor.owner} · {vendor.location} · Submitted {vendor.submittedAt}
              </p>
            </div>
            {vendor.status !== "pending" ? (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  vendor.status === "approved"
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-rose-50 text-rose-900"
                )}
              >
                {vendor.status}
              </span>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => updateStatus(vendor.id, "rejected")}
                >
                  Reject
                </Button>
                <Button size="sm" type="button" onClick={() => updateStatus(vendor.id, "approved")}>
                  Approve
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
