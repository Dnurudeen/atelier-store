import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { CurrentYear } from "@/components/layout/current-year";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop?category=fine-art", label: "Fine Art" },
      { href: "/shop?category=fashion", label: "Fashion" },
      { href: "/shop?category=ceramics", label: "Ceramics" },
      { href: "/shop?category=sculpture", label: "Sculpture" },
      { href: "/shop?category=leatherwork", label: "Leatherwork" },
      { href: "/shop?category=home-decor", label: "Home Decor" },
    ],
  },
  {
    title: "For Makers",
    links: [
      { href: "/become-a-vendor", label: "Become a Vendor" },
      { href: "/vendor", label: "Vendor Dashboard" },
      { href: "/makers", label: "Meet the Makers" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Atelier" },
      { href: "/contact", label: "Contact" },
      { href: "/account", label: "My Account" },
      { href: "/shop", label: "All Products" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-burgundy text-white">
      <div className="container-atelier grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <BrandLogo variant="footer" href="/" />
          <p className="max-w-sm text-sm leading-relaxed text-white/75">
            Nigeria&apos;s leading handcrafted marketplace — empowering painters,
            designers, and artisans to sell with confidence.
          </p>
          <p className="text-xs tracking-widest text-white/50 uppercase">
            www.atelierstore.studio
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 font-sans text-sm font-semibold tracking-wide text-white">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-atelier flex flex-col gap-3 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            ©{" "}
            <Suspense fallback={2026}>
              <CurrentYear />
            </Suspense>{" "}
            Atelier Nigeria. All rights reserved.
          </p>
          <p>Handcrafted excellence for creators across Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
