"use client";

import { useState } from "react";
import { Copy, Ticket } from "lucide-react";
import { AccountCard, Tabs } from "@/components/account/account-card";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import type { Voucher } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";
import { formatNaira } from "@/lib/utils";
import { voucherHeadline } from "@/lib/vouchers";

type Used = { id: number; discount: string; created_at: string; coupon: Voucher; order?: { order_number: string } };

export default function VouchersPage() {
  const [tab, setTab] = useState<"active" | "used">("active");
  const { data, isLoading } = useAccountList<{ available: Voucher[]; used: Used[] }>("vouchers", "/account/vouchers");

  return (
    <AccountCard title="Vouchers">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "active", label: "Active", count: data?.data.available.length },
          { value: "used", label: "Used", count: data?.data.used.length },
        ]}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : tab === "active" ? (
        !data?.data.available.length ? (
          <EmptyState icon={Ticket} title="You currently have no available vouchers" text="All your available vouchers will be displayed here." action={{ label: "Continue shopping", href: "/shop" }} />
        ) : (
          <ul className="grid gap-3 p-4 md:grid-cols-2">
            {data.data.available.map((v) => (
              <li key={v.id} className="relative overflow-hidden rounded-md border border-dashed border-crimson/50 bg-crimson/[0.03] p-4">
                <p className="text-lg font-bold text-crimson">{voucherHeadline(v)}</p>
                {v.description && <p className="text-[13px]">{v.description}</p>}
                <ul className="mt-1 text-[12px] text-muted">
                  {v.min_order && <li>Minimum spend {formatNaira(v.min_order)}</li>}
                  {v.store && <li>Only on {v.store.name}</li>}
                  {v.category && <li>Only on {v.category.name}</li>}
                  {v.first_order_only && <li>First order only</li>}
                  {v.ends_at && <li>Expires {formatDate(v.ends_at)}</li>}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(v.code);
                    toast.success(`Code ${v.code} copied. Paste it in your cart.`);
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-crimson bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-crimson"
                >
                  {v.code} <Copy size={14} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : !data?.data.used.length ? (
        <EmptyState icon={Ticket} title="You haven't used any vouchers yet" />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.used.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span>
                <span className="font-mono font-bold">{u.coupon?.code}</span>
                <span className="block text-muted">
                  Order {u.order?.order_number} · {formatDate(u.created_at)}
                </span>
              </span>
              <span className="font-semibold text-emerald-700">-{formatNaira(u.discount)}</span>
            </li>
          ))}
        </ul>
      )}
    </AccountCard>
  );
}
