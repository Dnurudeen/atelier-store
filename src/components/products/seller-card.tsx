"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, CircleMinus, CircleX } from "lucide-react";
import type { SellerScore, Store } from "@/lib/api";
import { useFollow } from "@/lib/follows";
import { cn } from "@/lib/utils";

function grade(value: number | null | undefined, invert = false) {
  if (value == null) return { label: "Not enough data", icon: CircleMinus, tone: "text-muted" };
  const v = invert ? 1 - value : value;
  if (v >= 0.9) return { label: "Excellent", icon: CircleCheck, tone: "text-burgundy" };
  if (v >= 0.75) return { label: "Good", icon: CircleCheck, tone: "text-burgundy" };
  if (v >= 0.5) return { label: "Average", icon: CircleMinus, tone: "text-muted" };
  return { label: "Poor", icon: CircleX, tone: "text-crimson" };
}

function Row({ label, value, invert }: { label: string; value?: number | null; invert?: boolean }) {
  const g = grade(value, invert);
  const Icon = g.icon;
  return (
    <li className="flex items-center gap-1.5">
      <Icon size={15} className={g.tone} />
      <span className="text-muted">{label}:</span>
      <span className="font-semibold">{g.label}</span>
    </li>
  );
}

/** Jumia "Seller Information": name, score, followers, follow button, performance. */
export function SellerCard({ store, followers = 0 }: { store: Store; followers?: number }) {
  const { following, toggle, pending } = useFollow(store);
  const score: SellerScore | null | undefined = store.seller_score;
  const scorePct = score?.score != null ? Math.round((score.score / 5) * 100) : null;

  return (
    <section className="rounded-md bg-white">
      <Link href={`/makers/${store.slug}`} className="flex items-center justify-between border-b border-border px-4 py-3 hover:bg-surface">
        <h2 className="text-[13px] font-bold tracking-wide uppercase">Seller Information</h2>
        <ChevronRight size={16} className="text-muted" />
      </Link>
      <div className="p-4 text-[13px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/makers/${store.slug}`} className="block truncate font-semibold hover:text-burgundy">
              {store.name}
            </Link>
            <p className="text-muted">
              {scorePct !== null ? (
                <>
                  <span className="font-semibold text-foreground">{scorePct}%</span> Seller Score
                </>
              ) : (
                "New seller"
              )}
            </p>
            <p className="text-muted">
              <span className="font-semibold text-foreground">{followers.toLocaleString()}</span> Followers
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-pressed={following}
            className={cn(
              "h-8 shrink-0 rounded-md px-4 text-[12px] font-bold uppercase transition disabled:opacity-60",
              following ? "border border-border text-foreground hover:border-crimson hover:text-crimson" : "bg-crimson text-white hover:bg-crimson-hover"
            )}
          >
            {following ? "Following" : "Follow"}
          </button>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 font-semibold">Seller Performance</p>
        <ul className="mt-1.5 space-y-1">
          <Row label="Shipping speed" value={score?.shipping_speed} />
          <Row label="Customer rating" value={score?.customer_rating != null ? score.customer_rating / 5 : null} />
          <Row label="Cancellation rate" value={score?.cancellation_rate} invert />
          <Row label="Return rate" value={score?.return_rate} invert />
        </ul>
      </div>
    </section>
  );
}
