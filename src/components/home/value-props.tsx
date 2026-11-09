import { BadgeCheck, HandHeart, ShieldCheck, Truck } from "lucide-react";

const items = [
  {
    icon: HandHeart,
    title: "Made by hand",
    body: "Each listing is verified as original work from independent Nigerian artisans.",
  },
  {
    icon: BadgeCheck,
    title: "Authenticated makers",
    body: "Vendors pass review before selling, so buyers know who crafted every piece.",
  },
  {
    icon: Truck,
    title: "Coordinated shipping",
    body: "Carts with items from several makers are split carefully, with tracking for each parcel.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    body: "Protected payments and clear policies for buyers and sellers alike.",
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-border bg-white py-6 md:py-16">
      <div className="container-atelier">
        {/* Mobile compact chips */}
        <div className="mobile-rail -mx-4 flex px-4 md:hidden">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex w-[72vw] max-w-[260px] items-start gap-3 rounded-2xl border border-border bg-surface/70 p-3.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy/8 text-burgundy">
                <item.icon size={16} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-[0.95rem] leading-tight">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden gap-8 sm:grid-cols-2 md:grid lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-burgundy/8 text-burgundy">
                <item.icon size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-lg">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
