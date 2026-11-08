"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { demoAddresses, type DemoAddress } from "@/lib/demo-dashboard";

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<DemoAddress[]>(demoAddresses);

  function setDefault(id: number) {
    setAddresses((list) => list.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Addresses</h2>
          <p className="mt-1 text-sm text-muted">Where we deliver your orders.</p>
        </div>
        <Button variant="outline" size="sm" type="button">
          Add address
        </Button>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {addr.label}
                {addr.isDefault ? (
                  <span className="ml-2 rounded-full bg-burgundy/10 px-2 py-0.5 text-xs text-burgundy">
                    Default
                  </span>
                ) : null}
              </p>
            </div>
            <p className="mt-2 text-sm text-foreground">{addr.name}</p>
            <p className="text-sm text-muted">{addr.phone}</p>
            <p className="mt-2 text-sm text-muted">
              {addr.line1}, {addr.city}, {addr.state}
            </p>
            {!addr.isDefault ? (
              <button
                type="button"
                onClick={() => setDefault(addr.id)}
                className="mt-4 text-sm font-medium text-burgundy hover:underline"
              >
                Set as default
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
