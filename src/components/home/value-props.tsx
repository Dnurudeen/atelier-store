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
    body: "Vendors pass review before selling — so buyers know who crafted every piece.",
  },
  {
    icon: Truck,
    title: "Coordinated shipping",
    body: "Multi-vendor carts are split thoughtfully, with tracking for every sub-order.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    body: "Protected payments and transparent policies designed for buyers and sellers alike.",
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-border bg-white py-12 md:py-16">
      <div className="container-atelier">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
