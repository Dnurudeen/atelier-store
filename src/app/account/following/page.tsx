"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { StoreFollowButton } from "@/components/shop/store-follow-button";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { useFollowedStores } from "@/lib/follows";
import { media } from "@/lib/media";

export default function FollowedSellersPage() {
  const { data, isLoading } = useFollowedStores();

  return (
    <AccountCard title="Followed Sellers">
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.length ? (
        <EmptyState icon={Store} title="You are not following any seller yet" text="Follow your favourite makers to find their new products quickly." action={{ label: "Browse official stores", href: "/makers" }} />
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2">
          {data.map((store) => (
            <li key={store.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <Link href={`/makers/${store.slug}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
                <AppImage src={store.logo || media.makerAvatar(store.id)} alt="" fill sizes="56px" frameClassName="absolute inset-0" />
              </Link>
              <div className="min-w-0 flex-1 text-[13px]">
                <Link href={`/makers/${store.slug}`} className="block truncate font-semibold hover:text-burgundy">
                  {store.name}
                </Link>
                <p className="text-muted">
                  {store.products_count ?? 0} products · {store.followers_count ?? 0} followers
                </p>
              </div>
              <StoreFollowButton store={store} className="h-8 px-3 text-[11px]" />
            </li>
          ))}
        </ul>
      )}
    </AccountCard>
  );
}
