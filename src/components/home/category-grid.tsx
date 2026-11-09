import Link from "next/link";
import type { Category } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="bg-white py-8 md:py-20">
      <div className="container-atelier">
        <div className="mb-5 flex items-end justify-between gap-3 md:mb-10 md:flex-col md:items-stretch md:gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-crimson uppercase md:text-xs">
              Browse by craft
            </p>
            <h2 className="mt-1 font-display text-2xl md:mt-2 md:text-4xl">Shop categories</h2>
          </div>
          <Link
            href="/shop"
            className="shrink-0 text-xs font-medium text-burgundy underline-offset-4 hover:underline md:text-sm"
          >
            View all
          </Link>
        </div>

        {/* Mobile: horizontal app rail */}
        <div className="mobile-rail -mx-4 flex px-4 md:hidden">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group relative w-[42vw] max-w-[168px] overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <AppImage
                  src={category.image || media.category(category.slug)}
                  alt={category.name}
                  fill
                  sizes="168px"
                  className="transition duration-700 group-active:scale-105"
                  frameClassName="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <h3 className="font-display text-base leading-tight">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden gap-4 sm:grid-cols-2 md:grid lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <AppImage
                  src={category.image || media.category(category.slug)}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="transition duration-700 group-hover:scale-105"
                  frameClassName="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="font-display text-2xl">{category.name}</h3>
                {category.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/75">{category.description}</p>
                )}
                <span className="mt-3 inline-block text-xs font-semibold tracking-wider uppercase text-white/90">
                  Shop now →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
