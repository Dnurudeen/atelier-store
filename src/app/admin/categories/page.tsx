import Image from "next/image";
import { demoCategories } from "@/lib/demo-data";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Categories</h2>
        <p className="mt-1 text-sm text-muted">Browse taxonomy used across the catalog.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demoCategories.map((cat) => (
          <article
            key={cat.id}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            {cat.image ? (
              <div className="relative h-32 w-full bg-surface">
                <Image src={cat.image} alt="" fill className="object-cover" sizes="320px" />
              </div>
            ) : null}
            <div className="p-4">
              <p className="font-medium">{cat.name}</p>
              <p className="text-xs text-muted">/{cat.slug}</p>
              {cat.description ? <p className="mt-2 text-sm text-muted">{cat.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
