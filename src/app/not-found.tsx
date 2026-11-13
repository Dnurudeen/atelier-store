import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-[var(--page-bg)] py-16">
      <div className="container-atelier max-w-lg">
        <div className="rounded-md bg-white p-8 text-center">
          <SearchX className="mx-auto h-14 w-14 text-muted" aria-hidden />
          <h1 className="mt-4 font-display text-2xl text-burgundy">We can&apos;t find that page</h1>
          <p className="mt-2 text-sm text-muted">
            The link may be broken, or the product may no longer be available. Try searching, or explore our categories.
          </p>
          <form action="/shop" className="mx-auto mt-6 flex max-w-sm gap-2">
            <input
              name="q"
              placeholder="Search products"
              aria-label="Search products"
              className="h-10 min-w-0 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-burgundy"
            />
            <button className="h-10 rounded-md bg-crimson px-4 text-sm font-semibold text-white hover:bg-crimson-hover">Search</button>
          </form>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-burgundy hover:underline">
            Back to the homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
