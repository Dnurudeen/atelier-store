"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { CurrentYear } from "@/components/layout/current-year";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { useCategories } from "@/lib/hooks";
import { FOOTER_SOCIAL } from "@/lib/social";

const columns = [
  {
    title: "Need help?",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/contact", label: "Contact us" },
      { href: "/account/orders", label: "Track your order" },
      { href: "/returns", label: "Returns & refunds" },
      { href: "/shipping", label: "Delivery options" },
    ],
  },
  {
    title: "About Atelier",
    links: [
      { href: "/about", label: "About us" },
      { href: "/makers", label: "Official stores" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
  {
    title: "Make money with Atelier",
    links: [
      { href: "/become-a-vendor", label: "Sell on Atelier" },
      { href: "/register?as=vendor", label: "Open a store" },
      { href: "/vendor", label: "Seller Center" },
      { href: "/help#selling", label: "Seller FAQ" },
    ],
  },
];

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setState(null);
    try {
      const res = await api<{ message: string }>("/newsletter", { method: "POST", body: { email }, token: null });
      setState({ tone: "ok", text: res.message });
      setEmail("");
    } catch (err) {
      setState({ tone: "error", text: fieldErrors(err).email || errorMessage(err, "Could not subscribe right now.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-burgundy text-white">
      <div className="container-atelier flex flex-col gap-5 py-7 md:flex-row md:items-center md:justify-between md:py-8">
        <div className="flex items-center gap-3">
          <BrandLogo variant="footer" href="/" />
        </div>
        <form onSubmit={submit} className="w-full max-w-xl">
          <p className="text-[12px] font-bold tracking-wide uppercase">New to Atelier?</p>
          <p className="text-[12px] text-white/70">Get new arrivals and offers in your inbox.</p>
          <div className="mt-2 flex gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 text-foreground">
              <Mail size={16} className="text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <button disabled={loading} className="h-10 rounded-md bg-crimson px-4 text-[13px] font-bold uppercase hover:bg-crimson-hover disabled:opacity-60">
              Subscribe
            </button>
          </div>
          {state && <p className={`mt-2 text-[12px] ${state.tone === "ok" ? "text-white" : "text-white/80"}`}>{state.text}</p>}
        </form>
      </div>
    </div>
  );
}

export function Footer() {
  const { data: categories = [] } = useCategories();

  return (
    <footer className="mt-auto">
      <Newsletter />
      <div className="bg-burgundy-deep text-white/85">
        <div className="container-atelier grid grid-cols-2 gap-x-6 gap-y-8 py-10 text-[13px] md:grid-cols-4 md:gap-10 md:py-12">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 font-sans text-[13px] font-bold tracking-normal text-white uppercase">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-3 font-sans text-[13px] font-bold tracking-normal text-white uppercase">Shop categories</h3>
            <ul className="space-y-2">
              {categories.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="hover:text-white hover:underline">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-atelier flex flex-col gap-4 py-5 text-[12px] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 font-bold tracking-wide text-white uppercase">Payment methods &amp; delivery partners</p>
              <div className="flex flex-wrap gap-2">
                {["Paystack", "Visa", "Mastercard", "Verve", "Bank transfer", "USSD"].map((m) => (
                  <span key={m} className="rounded bg-white px-2 py-1 text-[11px] font-bold text-foreground">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-bold tracking-wide text-white uppercase">Join us on</p>
              <div className="flex flex-wrap gap-2">
                {FOOTER_SOCIAL.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold hover:bg-crimson"
                  >
                    {s.short}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-3.5 text-center text-[11px] text-white/70">
          © <CurrentYear /> Atelier Nigeria. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
