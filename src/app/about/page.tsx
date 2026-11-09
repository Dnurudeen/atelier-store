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
          Atelier Nigeria is a multivendor marketplace built for craftspeople who deserve the same quality of
          presentation and commerce tools as global design houses, without losing the intimacy of handmade
          work.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted">
          We partner with painters, ceramists, leather artisans, and furniture makers across the country. Every
          vendor is reviewed before listing. Every piece ships with clarity on who made it and where it came
          from.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted">
          The platform handles carts from several makers, coordinated shipping, and secure checkout so makers
          can stay focused on their craft.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center rounded-full bg-burgundy px-6 text-sm font-medium text-white hover:bg-burgundy-deep"
          >
            Explore the shop
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
