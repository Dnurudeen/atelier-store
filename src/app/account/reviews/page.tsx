"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { AccountCard, Tabs } from "@/components/account/account-card";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import type { OrderItem, Review } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";

export default function ReviewsPage() {
  const [tab, setTab] = useState<"pending" | "mine">("pending");
  const pending = useAccountList<(OrderItem & { sub_order?: { delivered_at?: string } })[]>("pending-reviews", "/account/reviews/pending", tab === "pending");
  const mine = useAccountList<Review[]>("my-reviews", "/account/reviews", tab === "mine");

  return (
    <AccountCard title="Pending Reviews">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Waiting for review", count: pending.data?.data.length },
          { value: "mine", label: "My reviews" },
        ]}
      />
      {tab === "pending" ? (
        pending.isLoading ? (
          <ListSkeleton />
        ) : !pending.data?.data.length ? (
          <EmptyState icon={MessageSquareText} title="You have no orders waiting for feedback" text="After getting your products delivered, you can rate and review them. Your feedback helps other shoppers." action={{ label: "Continue shopping", href: "/shop" }} />
        ) : (
          <ul className="divide-y divide-border">
            {pending.data.data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-surface">
                  <AppImage src={item.image ?? item.product?.images?.[0]?.url} alt="" fill sizes="64px" frameClassName="absolute inset-0" />
                </span>
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="line-clamp-2 font-medium">{item.product_name}</p>
                  {item.sub_order?.delivered_at && <p className="text-muted">Delivered on {formatDate(item.sub_order.delivered_at)}</p>}
                </div>
                {item.product?.slug && (
                  <Link href={`/product/${item.product.slug}#reviews`} className="shrink-0 rounded-md bg-crimson px-3 py-2 text-[12px] font-bold text-white uppercase hover:bg-crimson-hover">
                    Rate this product
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )
      ) : mine.isLoading ? (
        <ListSkeleton />
      ) : !mine.data?.data.length ? (
        <EmptyState icon={MessageSquareText} title="You haven't written any reviews yet" />
      ) : (
        <ul className="divide-y divide-border">
          {mine.data.data.map((r) => (
            <li key={r.id} className="flex gap-3 px-4 py-3 text-[13px]">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-surface">
                <AppImage src={r.product?.images?.[0]?.url} alt="" fill sizes="56px" frameClassName="absolute inset-0" />
              </span>
              <div className="min-w-0 flex-1">
                {r.product && (
                  <Link href={`/product/${r.product.slug}`} className="line-clamp-1 font-medium hover:text-burgundy">
                    {r.product.name}
                  </Link>
                )}
                <RatingStars value={r.rating} size={13} />
                {r.title && <p className="font-semibold">{r.title}</p>}
                {r.comment && <p className="text-foreground/80">{r.comment}</p>}
                <p className="text-[12px] text-muted">{formatDate(r.created_at)}</p>
                {r.vendor_reply && <p className="mt-1 rounded bg-surface px-2 py-1"><span className="font-semibold text-burgundy">Seller:</span> {r.vendor_reply}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountCard>
  );
}
