import Image from "next/image";
import { demoBanners } from "@/lib/demo-data";

export default function AdminBannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Homepage banners</h2>
        <p className="mt-1 text-sm text-muted">Hero slides on the storefront.</p>
      </div>
      <ul className="space-y-4">
        {demoBanners.map((banner) => (
          <li
            key={banner.id}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <div className="relative h-40 w-full bg-surface md:h-48">
              <Image src={banner.image} alt="" fill className="object-cover" sizes="900px" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2 p-5">
              <div>
                <p className="font-display text-lg">{banner.title}</p>
                <p className="text-sm text-muted">{banner.subtitle}</p>
                <p className="mt-2 text-xs text-muted">
                  CTA: {banner.cta_label} → {banner.cta_url}
                </p>
              </div>
              <span
                className={
                  banner.is_active
                    ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900"
                    : "rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
                }
              >
                {banner.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
