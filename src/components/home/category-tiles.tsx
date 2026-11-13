import Link from "next/link";
import type { Category } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";

/** Grid of category "deal" tiles (Jumia: "Deals made for you", "Phones & Tablets", …). */
export function CategoryTiles({ categories, title = "Shop by category" }: { categories: Category[]; title?: string }) {
  const tiles = categories.flatMap((c) => [c, ...(c.children ?? []).slice(0, 2)]).slice(0, 12);
  if (tiles.length === 0) return null;

  return (
    <section className="pt-3">
      <div className="container-atelier">
        <div className="rounded-md bg-white p-3 md:p-4">
          <h2 className="mb-3 font-sans text-lg font-bold tracking-normal md:text-[22px]">{title}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3 lg:grid-cols-6">
            {tiles.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`} className="group text-center">
                <span className="relative block aspect-square overflow-hidden rounded-md bg-surface-warm">
                  <AppImage
                    src={category.image || media.category(category.slug)}
                    alt=""
                    fill
                    sizes="(max-width:768px) 33vw, 180px"
                    frameClassName="absolute inset-0"
                    className="transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-1.5 block truncate text-[12px] font-medium text-foreground/90 md:text-[13px]">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
