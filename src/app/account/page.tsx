"use client";

import Link from "next/link";
import { useState } from "react";
import { MailWarning, Package, Pencil } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { AppImage } from "@/components/ui/app-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { formatDate, orderPreview, useAccountOverview } from "@/lib/account";
import { formatNaira } from "@/lib/utils";

function Box({ title, href, edit, children }: { title: string; href?: string; edit?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="font-sans text-[13px] font-bold tracking-wide uppercase">{title}</h2>
        {href && (
          <Link href={href} className="rounded-full p-1.5 text-crimson hover:bg-crimson/10" aria-label={`Edit ${title}`}>
            {edit ? <Pencil size={15} /> : <span className="text-[12px] font-semibold">View</span>}
          </Link>
        )}
      </div>
      <div className="p-3 text-[13px]">{children}</div>
    </div>
  );
}

export default function AccountOverviewPage() {
  const { data, isLoading } = useAccountOverview();
  const [resending, setResending] = useState(false);

  async function resend() {
    setResending(true);
    try {
      const res = await api<{ message: string }>("/auth/email/resend", { method: "POST" });
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err, "Could not send the email."));
    } finally {
      setResending(false);
    }
  }

  if (isLoading || !data) {
    return (
      <AccountCard title="Account Overview" bodyClassName="grid gap-3 p-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-md" />
        ))}
      </AccountCard>
    );
  }

  const { user, counts, default_address: address } = data;

  return (
    <div className="space-y-3">
      {user.email_verified === false && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <MailWarning size={18} /> Please confirm your email address so we can send receipts and delivery updates.
          </p>
          <button type="button" onClick={() => void resend()} disabled={resending} className="font-semibold underline disabled:opacity-60">
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      <AccountCard title="Account Overview" bodyClassName="grid gap-3 p-4 md:grid-cols-2">
        <Box title="Account details" href="/account/profile" edit>
          <p className="font-semibold">{user.name}</p>
          <p className="text-muted">{user.email}</p>
          {user.phone && <p className="text-muted">{user.phone}</p>}
        </Box>
        <Box title="Address book" href="/account/addresses" edit>
          <p className="font-semibold">Your default shipping address:</p>
          {address ? (
            <p className="mt-1 text-muted">
              {address.full_name}
              <br />
              {address.address_line}, {address.city}, {address.state}
              <br />
              {address.phone}
            </p>
          ) : (
            <p className="mt-1 text-muted">
              No default address yet.{" "}
              <Link href="/account/addresses" className="font-semibold text-crimson">
                Add one
              </Link>
            </p>
          )}
        </Box>
        <Box title="Atelier wallet" href="/account/vouchers">
          <p className="text-2xl font-bold">{counts.vouchers}</p>
          <p className="text-muted">voucher{counts.vouchers === 1 ? "" : "s"} available to use</p>
          <p className="mt-2 text-muted">Lifetime spend: <span className="font-semibold text-foreground">{formatNaira(data.total_spent)}</span></p>
        </Box>
        <Box title="Newsletter preferences" href="/account/profile#newsletter" edit>
          <p className="text-muted">
            {user.newsletter_opt_in ? "You're subscribed to deals and new arrivals." : "You're not subscribed to our newsletter."}
          </p>
          <Link href="/account/profile#newsletter" className="mt-2 inline-block font-semibold text-crimson uppercase">
            Edit newsletter preferences
          </Link>
        </Box>
      </AccountCard>

      <AccountCard
        title="Recent orders"
        action={
          <Link href="/account/orders" className="text-[13px] font-semibold text-crimson uppercase">
            See all
          </Link>
        }
      >
        {data.recent_orders.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center text-sm">
            <Package className="h-10 w-10 text-muted" />
            <p className="mt-2 font-semibold">You haven&apos;t placed any orders yet</p>
            <Link href="/shop" className="mt-3 rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.recent_orders.map((order) => {
              const p = orderPreview(order);
              return (
                <li key={order.id}>
                  <Link href={`/account/orders/${order.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-surface">
                      <AppImage src={p.image} alt="" fill sizes="56px" frameClassName="absolute inset-0" />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px]">
                      <span className="line-clamp-1 font-medium">{p.title}</span>
                      <span className="text-muted">
                        Order {order.order_number} · {formatDate(order.created_at)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <StatusBadge status={order.payment_status === "paid" ? order.status : order.payment_status} />
                      <span className="text-[13px] font-semibold">{formatNaira(order.total)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AccountCard>
    </div>
  );
}
