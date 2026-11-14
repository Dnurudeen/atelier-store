"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { MapPin, PackageCheck, RotateCcw, Truck } from "lucide-react";
import type { Store } from "@/lib/api";
import { formatDeliveryRange, NIGERIAN_STATES } from "@/lib/nigeria";
import { formatNaira } from "@/lib/utils";

const KEY = "atelier-delivery-state";
const EVENT = "atelier:delivery-state";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Jumia "Delivery & Returns" box: choose your state, see fee and expected dates. */
export function DeliveryCard({ store }: { store?: Store | null }) {
  const state = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY) || "Lagos", () => "Lagos");
  const fee = Number(store?.shipping_fee ?? 0);
  const range = useSyncExternalStore(subscribe, () => formatDeliveryRange(store?.location, state), () => "");

  function choose(value: string) {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <section className="rounded-md bg-white">
      <h2 className="border-b border-border px-4 py-3 text-[13px] font-bold tracking-wide uppercase">Delivery &amp; Returns</h2>
      <div className="space-y-3.5 p-4 text-[13px]">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 font-semibold">
            <MapPin size={14} className="text-burgundy" /> Choose your location
          </span>
          <select
            value={state}
            onChange={(e) => choose(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-white px-2 outline-none focus:border-burgundy"
          >
            {NIGERIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-2.5">
          <Truck size={20} className="mt-0.5 shrink-0 text-burgundy" />
          <div>
            <p className="font-semibold">Door Delivery</p>
            <p className="text-muted">
              Delivery fee <span className="font-semibold text-foreground">{fee > 0 ? formatNaira(fee) : "Free"}</span>
            </p>
            {range && <p className="text-muted">Arrives between <span className="font-semibold text-foreground">{range}</span> when you order today.</p>}
          </div>
        </div>

        <div className="flex gap-2.5">
          <PackageCheck size={20} className="mt-0.5 shrink-0 text-burgundy" />
          <div>
            <p className="font-semibold">Ships from</p>
            <p className="text-muted">{store?.location || "Nigeria"}</p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <RotateCcw size={20} className="mt-0.5 shrink-0 text-burgundy" />
          <div>
            <p className="font-semibold">Return Policy</p>
            <p className="text-muted">
              Free returns within 7 days of delivery for eligible items.{" "}
              <Link href="/returns" className="font-medium text-burgundy hover:underline">
                Details
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
