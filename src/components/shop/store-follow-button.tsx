"use client";

import type { Store } from "@/lib/api";
import { useFollow } from "@/lib/follows";
import { cn } from "@/lib/utils";

export function StoreFollowButton({ store, className }: { store: Pick<Store, "id" | "name">; className?: string }) {
  const { following, toggle, pending } = useFollow(store);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "h-9 rounded-md px-5 text-[13px] font-bold uppercase transition disabled:opacity-60",
        following ? "border border-border bg-white text-foreground hover:border-crimson hover:text-crimson" : "bg-crimson text-white hover:bg-crimson-hover",
        className
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
