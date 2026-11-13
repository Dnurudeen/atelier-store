"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, Clock, Mail, MessageCircle } from "lucide-react";
import { InfoPageClient } from "@/components/layout/info-page-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const TOPICS = [
  { value: "order", label: "An order I placed" },
  { value: "payment", label: "Payment or refund" },
  { value: "returns", label: "Returning an item" },
  { value: "selling", label: "Selling on Atelier" },
  { value: "account", label: "My account" },
  { value: "general", label: "Something else" },
];

export default function ContactPage() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ name: "", email: "", topic: "order", order_number: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const name = form.name || user?.name || "";
  const email = form.email || user?.email || "";
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{ data: { ticket: number } }>("/contact", {
        method: "POST",
        body: { ...form, name, email, order_number: form.order_number || undefined },
      });
      setSent(res.data.ticket);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, "We couldn't send your message."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <InfoPageClient title="Contact us" intro="Questions about an order, a maker, or selling on Atelier? We reply within one business day.">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        {sent ? (
          <div className="rounded-md border border-emerald-600/20 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-2 font-semibold">Message sent — ticket #{sent}</p>
            <p className="mt-1 text-sm text-muted">We&apos;ll reply to {email}. For order issues you can also check your order page for updates.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Your name" value={name} onChange={(e) => set("name", e.target.value)} error={errors.name} required />
              <Input label="Email" type="email" value={email} onChange={(e) => set("email", e.target.value)} error={errors.email} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="topic" className="block text-[13px] font-medium text-foreground/80">
                  What is it about?
                </label>
                <select id="topic" value={form.topic} onChange={(e) => set("topic", e.target.value)} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-burgundy">
                  {TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Order number (optional)" placeholder="ATL-XXXXXXXX" value={form.order_number} onChange={(e) => set("order_number", e.target.value)} error={errors.order_number} />
            </div>
            <Textarea label="Message" value={form.message} onChange={(e) => set("message", e.target.value)} error={errors.message} rows={6} minLength={10} required />
            {error && !Object.values(errors).some(Boolean) && <p className="text-[13px] text-crimson">{error}</p>}
            <Button type="submit" loading={loading}>
              Send message
            </Button>
          </form>
        )}
        <aside className="space-y-4 text-sm">
          <p className="flex gap-2">
            <Mail size={18} className="shrink-0 text-burgundy" /> hello@atelierstore.studio
          </p>
          <p className="flex gap-2">
            <Clock size={18} className="shrink-0 text-burgundy" /> Mon–Sat, 8am–8pm WAT
          </p>
          <p className="flex gap-2">
            <MessageCircle size={18} className="shrink-0 text-burgundy" />
            <span>
              Quick answers in our <Link href="/help" className="text-burgundy underline">Help Center</Link>.
            </span>
          </p>
        </aside>
      </div>
    </InfoPageClient>
  );
}
