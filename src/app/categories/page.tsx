import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { getCategories } from "@/lib/catalog";
import { media } from "@/lib/media";

export const metadata: Metadata = { title: "All categories" };
export const revalidate = 300;

/** Mobile "Categories" tab: every category with its sub-categories (Jumia app pattern). */
export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-[var(--page-bg)] pb-8">
      <div className="container-atelier space-y-3 pt-3">
        <h1 className="font-sans text-lg font-bold tracking-normal">All categories</h1>
        {categories.length === 0 && <p className="rounded-md bg-white p-6 text-center text-sm text-muted">Categories are not available right now.</p>}
        {categories.map((category) => (
          <section key={category.id} className="rounded-md bg-white">
            <Link href={`/category/${category.slug}`} className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <h2 className="font-sans text-[15px] font-bold tracking-normal">{category.name}</h2>
              <span className="flex items-center text-[12px] font-semibold text-crimson">
                See all <ChevronRight size={14} />
              </span>
            </Link>
            <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4 md:grid-cols-6">
              {(category.children?.length ? category.children : [category]).map((child) => (
                <Link key={child.id} href={`/category/${child.slug}`} className="text-center">
                  <span className="relative block aspect-square overflow-hidden rounded-md bg-surface-warm">
                    <AppImage src={child.image || category.image || media.category(category.slug)} alt="" fill sizes="120px" frameClassName="absolute inset-0" />
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[12px]">{child.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
