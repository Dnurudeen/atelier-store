import Link from "next/link";
import { CheckCircle2, Store, Wallet, Package } from "lucide-react";

export const metadata = {
  title: "Become a Vendor",
  description: "Sell your handmade work on Atelier Nigeria.",
};

const steps = [
  {
    icon: Store,
    title: "Open your storefront",
    body: "Share your story, logo, and craft focus. We review every application before you go live.",
  },
  {
    icon: Package,
    title: "List your pieces",
    body: "Photograph your work, set fair prices in Naira, and manage inventory from your vendor dashboard.",
  },
  {
    icon: Wallet,
    title: "Get paid with confidence",
    body: "Orders route to your studio with clear shipping fees and payout tracking built in.",
  },
];

const benefits = [
  "Reach buyers who value authentic Nigerian craft",
  "Cart support for several makers, with shipping per store",
  "Dedicated support during onboarding",
  "Marketing on Atelier home and category pages",
];

export default function BecomeAVendorPage() {
  return (
    <div className="bg-surface-warm">
      <section className="border-b border-border bg-burgundy text-white">
        <div className="container-atelier py-16 md:py-24">
          <p className="text-xs font-semibold tracking-[0.22em] text-white/65 uppercase">For artisans</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight md:text-5xl">
            Turn your studio into a storefront on Atelier Nigeria
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80">
            Whether you paint, throw pottery, or stitch leather in Aba, we built this marketplace for makers
            who want a professional home online!
          </p>
          <Link
            href="/register?role=vendor"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-crimson transition hover:bg-surface-warm"
          >
            Start vendor registration
          </Link>
        </div>
      </section>

      <section className="container-atelier py-14 md:py-20">
        <h2 className="font-display text-3xl">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-burgundy/8 text-burgundy">
                <step.icon size={20} />
              </div>
              <h3 className="mt-4 font-display text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-white py-14">
        <div className="container-atelier grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl">Why sell with us</h2>
            <ul className="mt-6 space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-foreground/90">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-crimson" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-8">
            <h3 className="font-display text-2xl">Ready to apply?</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Applications take about ten minutes. You&apos;ll need a few product photos and basic business
              details. Our team typically responds within three business days.
            </p>
            <Link
              href="/register?role=vendor"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-burgundy px-6 text-sm font-medium text-white transition hover:bg-burgundy-deep"
            >
              Register as a vendor
            </Link>
            <p className="mt-4 text-xs text-muted">
              Already a vendor?{" "}
              <Link href="/vendor" className="font-medium text-burgundy hover:underline">
                Go to dashboard
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
