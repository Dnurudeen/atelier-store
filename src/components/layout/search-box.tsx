"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, LayoutGrid, Search, Store, X } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { api, type Category, type Product, type Store as StoreT } from "@/lib/api";
import { useDebounced, useDismiss } from "@/lib/hooks";
import { cn, formatNaira } from "@/lib/utils";

const RECENT_KEY = "atelier-recent-searches";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 6);
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

type Suggestions = { products: Product[]; stores: StoreT[]; categories: Category[] };

export function SearchBox({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const term = useDebounced(query.trim(), 220);

  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", term],
    queryFn: async () => (await api<{ data: Suggestions }>(`/search?q=${encodeURIComponent(term)}`, { token: null })).data,
    enabled: open && term.length >= 2,
    staleTime: 60_000,
  });

  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  function go(href: string, remember?: string) {
    if (remember) pushRecent(remember);
    setOpen(false);
    onDone?.();
    router.push(href);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    go(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop", q || undefined);
  }

  const hasResults = data && (data.products.length || data.stores.length || data.categories.length);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <form onSubmit={onSubmit} role="search" className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center rounded-md border border-[#c7c7cd] bg-white px-3 focus-within:border-burgundy focus-within:ring-2 focus-within:ring-burgundy/10">
          <Search size={16} className="shrink-0 text-muted" aria-hidden />
          <input
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setRecent(readRecent());
              setOpen(true);
            }}
            placeholder="Search products, brands…"
            aria-label="Search products, brands and categories"
            aria-expanded={open}
            aria-controls={listId}
            role="combobox"
            aria-autocomplete="list"
            className="h-full w-full min-w-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted hover:text-foreground">
              <X size={15} />
            </button>
          )}
        </label>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-md bg-burgundy px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-burgundy-deep md:px-5"
        >
          <span className="md:hidden">Go</span>
          <span className="hidden md:inline">Search</span>
        </button>
      </form>

      {open && (term.length >= 2 || recent.length > 0) && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-[60] mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-white py-1.5 text-sm shadow-xl"
        >
          {term.length < 2 ? (
            <>
              <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Recent searches</p>
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => go(`/shop?q=${encodeURIComponent(r)}`, r)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface">
                  <Clock size={14} className="text-muted" /> {r}
                </button>
              ))}
            </>
          ) : isFetching && !data ? (
            <p className="px-3 py-3 text-muted">Searching…</p>
          ) : !hasResults ? (
            <p className="px-3 py-3 text-muted">
              No quick matches. Press <strong>Search</strong> to see all results for “{term}”.
            </p>
          ) : (
            <>
              {data!.categories.map((c) => (
                <button key={`c${c.id}`} type="button" onClick={() => go(`/category/${c.slug}`)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface">
                  <LayoutGrid size={14} className="text-burgundy" />
                  <span>
                    <span className="font-medium">{c.name}</span> <span className="text-muted">in categories</span>
                  </span>
                </button>
              ))}
              {data!.products.map((p) => (
                <button key={`p${p.id}`} type="button" onClick={() => go(`/product/${p.slug}`, term)} className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-surface">
                  <AppImage src={p.images?.[0]?.url} alt="" width={36} height={36} className="h-9 w-9 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs font-semibold">{formatNaira(p.price)}</span>
                </button>
              ))}
              {data!.stores.map((s) => (
                <button key={`s${s.id}`} type="button" onClick={() => go(`/makers/${s.slug}`)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface">
                  <Store size={14} className="text-burgundy" />
                  <span>
                    <span className="font-medium">{s.name}</span> <span className="text-muted">· store</span>
                  </span>
                </button>
              ))}
              <Link
                href={`/shop?q=${encodeURIComponent(term)}`}
                onClick={() => {
                  pushRecent(term);
                  setOpen(false);
                  onDone?.();
                }}
                className="mt-1 block border-t border-border px-3 pt-2 pb-1 text-[13px] font-semibold text-burgundy hover:underline"
              >
                See all results for “{term}”
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
