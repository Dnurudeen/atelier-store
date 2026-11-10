import Link from "next/link";
import { BadgeCheck, HandHeart, ShieldCheck, Store, Truck } from "lucide-react";

const items = [
  { icon: HandHeart, title: "Handmade", href: "/shop" },
  { icon: BadgeCheck, title: "Verified makers", href: "/makers" },
  { icon: Store, title: "Official stores", href: "/makers" },
  { icon: Truck, title: "Tracked shipping", href: "/shop" },
  { icon: ShieldCheck, title: "Secure pay", href: "/shop" },
];

export function ValueProps() {
  return (
    <section className="bg-[var(--page-bg)] pt-3">
      <div className="container-atelier">
        <div className="overflow-hidden rounded-md border border-border bg-white">
          <div className="flex gap-1 overflow-x-auto px-2 py-3 md:grid md:grid-cols-5 md:gap-2 md:overflow-visible md:px-3">
            {items.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex min-w-[88px] flex-col items-center gap-2 rounded-md px-2 py-1.5 text-center transition hover:bg-surface"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-burgundy text-white md:h-14 md:w-14">
                  <item.icon size={22} strokeWidth={1.75} />
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground/85 md:text-xs">
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
