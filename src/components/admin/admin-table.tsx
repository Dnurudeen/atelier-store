"use client";

import { useState, type ReactNode } from "react";
import { Inbox, Search } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import type { PaginationMeta } from "@/lib/api";

export type Column<T> = { key: string; label: string; className?: string; render: (row: T) => ReactNode };

/**
 * Searchable, tabbed, paginated table used across the admin console.
 * Controlled by the page (it owns tab/query/page state) so URLs and data stay in sync.
 */
export function AdminTable<T extends { id: number | string }>({
  title,
  action,
  tabs,
  tab,
  onTab,
  onSearch,
  searchPlaceholder = "Search",
  columns,
  rows,
  meta,
  loading,
  page,
  onPage,
  empty = "Nothing here yet.",
  minWidth = 760,
  rowClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  tabs?: { value: string; label: string; count?: number }[];
  tab?: string;
  onTab?: (v: string) => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  columns: Column<T>[];
  rows?: T[];
  meta?: Pick<PaginationMeta, "current_page" | "last_page" | "total">;
  loading?: boolean;
  page?: number;
  onPage?: (p: number) => void;
  empty?: string;
  minWidth?: number;
  rowClassName?: (row: T) => string;
}) {
  const [q, setQ] = useState("");

  return (
    <Panel title={title} action={action}>
      {tabs && tab !== undefined && onTab && <Tabs value={tab} onChange={onTab} tabs={tabs} />}
      {onSearch && (
        <form
          className="flex gap-2 border-b border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(q.trim());
          }}
        >
          <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-burgundy">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm outline-none" aria-label={searchPlaceholder} />
          </label>
          <button className="h-9 rounded-md bg-burgundy px-4 text-sm font-semibold text-white">Search</button>
        </form>
      )}
      {loading && !rows ? (
        <ListSkeleton rows={5} />
      ) : !rows?.length ? (
        <EmptyState icon={Inbox} title={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]" style={{ minWidth }}>
            <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.className ?? ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-border ${loading ? "opacity-60" : ""}`}>
              {rows.map((row) => (
                <tr key={row.id} className={`align-top hover:bg-surface/60 ${rowClassName?.(row) ?? ""}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && onPage && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-border p-3 text-sm">
          <button disabled={(page ?? 1) <= 1} onClick={() => onPage((page ?? 1) - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            Page {meta.current_page} of {meta.last_page} · {meta.total.toLocaleString()} total
          </span>
          <button disabled={(page ?? 1) >= meta.last_page} onClick={() => onPage((page ?? 1) + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </Panel>
  );
}

/** Shared state for table pages. */
export function useTableState(initialTab = "") {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  return {
    tab,
    query,
    page,
    setPage,
    onTab: (v: string) => {
      setTab(v);
      setPage(1);
    },
    onSearch: (v: string) => {
      setQuery(v);
      setPage(1);
    },
  };
}
