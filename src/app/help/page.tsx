import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, MessageCircle, Package, RotateCcw, Store, Truck } from "lucide-react";
import { Faq, InfoPage, InfoSection } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Help Center", description: "Answers about orders, delivery, payments, returns and selling on Atelier." };

const topics = [
  { href: "/account/orders", icon: Package, title: "Track an order", text: "See where each package is" },
  { href: "/shipping", icon: Truck, title: "Delivery", text: "Fees, timelines and areas" },
  { href: "/returns", icon: RotateCcw, title: "Returns & refunds", text: "7-day easy returns" },
  { href: "#payments", icon: CreditCard, title: "Payments", text: "Cards, transfer & USSD" },
  { href: "#selling", icon: Store, title: "Selling", text: "Open and run a store" },
  { href: "/contact", icon: MessageCircle, title: "Contact us", text: "We reply within 1 day" },
];

export default function HelpPage() {
  return (
    <InfoPage title="Help Center" intro="How can we help you today?" current="/help">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {topics.map(({ href, icon: Icon, title, text }) => (
          <Link key={title} href={href} className="rounded-md border border-border p-4 transition hover:border-crimson hover:shadow-sm">
            <Icon className="h-6 w-6 text-crimson" aria-hidden />
            <p className="mt-2 font-semibold">{title}</p>
            <p className="text-[12px] text-muted">{text}</p>
          </Link>
        ))}
      </div>

      <InfoSection id="orders" title="Orders">
        <Faq
          items={[
            { q: "How do I track my order?", a: <>Go to <Link className="text-burgundy underline" href="/account/orders">My Account → Orders</Link> and open the order. Each seller ships separately, so you&apos;ll see a timeline and tracking number per package.</> },
            { q: "Can I cancel an order?", a: "Yes — you can cancel any package that hasn't shipped yet from the order page. If you already paid, your refund is processed to your original payment method within 5–10 business days." },
            { q: "Why did my order arrive in several packages?", a: "Atelier is a marketplace: each maker ships their own items. Your order is split into one package per seller, each with its own delivery fee and timeline." },
          ]}
        />
      </InfoSection>

      <InfoSection id="payments" title="Payments">
        <Faq
          items={[
            { q: "Which payment methods do you accept?", a: "Debit/credit cards (Visa, Mastercard, Verve), bank transfer and USSD, all processed securely by Paystack. We never see or store your card details." },
            { q: "My account was debited but the order shows unpaid", a: "Bank transfers can take a few minutes to confirm. If it's still unpaid after 30 minutes, contact us with your order number and we'll resolve it — you will never be charged twice." },
            { q: "How do vouchers work?", a: "Enter the code in your cart or at checkout. Some vouchers need a minimum spend, apply only to certain sellers or categories, or are for first orders only." },
          ]}
        />
      </InfoSection>

      <InfoSection id="selling" title="Selling on Atelier">
        <Faq
          items={[
            { q: "How do I open a store?", a: <>Create a <Link className="text-burgundy underline" href="/register?as=vendor">seller account</Link>, complete your store profile and payout details. We review new stores within 2 business days.</> },
            { q: "What does it cost?", a: "There's no monthly fee. We charge a commission on each completed sale; you'll see the exact amount on every order and in your weekly statement." },
            { q: "When do I get paid?", a: "Earnings from delivered orders are added to your weekly statement and paid to your bank account. Returned orders are deducted from the next statement." },
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
