import Link from "next/link";

export const metadata = {
  title: "About",
  description: "The story behind Atelier Nigeria.",
};

export default function AboutPage() {
  return (
    <div className="container-atelier py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-crimson uppercase">Our mission</p>
        <h1 className="mt-2 font-display text-4xl">About Atelier Nigeria</h1>
        <p className="mt-6 text-base leading-relaxed text-muted">
          Atelier Nigeria is where Nigerian makers sell their work online. We want shopping to feel simple and clear,
          while still showing the people and hands behind every piece.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted">
          We work with painters, ceramists, leather artisans and furniture makers across the country. Every seller
          is reviewed before they list. Every product shows who made it and where it came from.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted">
          The platform handles carts from several makers, delivery coordination and secure checkout, so makers can
          stay focused on their craft.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center rounded-full bg-burgundy px-6 text-sm font-medium text-white hover:bg-burgundy-deep"
          >
            Browse the shop
          </Link>
          <Link
            href="/become-a-vendor"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium hover:border-burgundy hover:text-burgundy"
          >
            Sell on Atelier
          </Link>
        </div>
      </div>
    </div>
  );
}
