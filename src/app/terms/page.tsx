import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms & conditions" intro="Please read these terms before using Atelier." current="/terms">
      <p className="rounded-md bg-surface-warm px-3 py-2 text-[13px] text-muted">
        This is a general template. Have it reviewed by your legal adviser before launch.
      </p>
      <InfoSection title="1. The marketplace">
        <p>Atelier Nigeria operates an online marketplace where independent sellers (&quot;makers&quot;) list and sell products to customers. Each sale is a contract between you and the seller; Atelier facilitates payment, delivery coordination and dispute resolution.</p>
      </InfoSection>
      <InfoSection title="2. Your account">
        <p>You are responsible for keeping your login details secure and for all activity on your account. Provide accurate information, and tell us immediately if you suspect unauthorised access.</p>
      </InfoSection>
      <InfoSection title="3. Orders and payment">
        <p>Prices are shown in Naira and include any applicable taxes unless stated. An order is confirmed only once payment succeeds. We may cancel orders affected by obvious pricing errors or stock problems and refund you in full.</p>
      </InfoSection>
      <InfoSection title="4. Delivery, returns and refunds">
        <p>Delivery estimates are not guarantees. Returns and refunds follow our Returns Policy.</p>
      </InfoSection>
      <InfoSection title="5. Sellers">
        <p>Sellers must list only genuine products they have the right to sell, describe them accurately, ship on time and honour returns. Atelier may remove listings or suspend stores that break these rules.</p>
      </InfoSection>
      <InfoSection title="6. Liability">
        <p>To the extent permitted by law, Atelier is not liable for indirect losses. Nothing in these terms limits your statutory rights as a consumer under Nigerian law.</p>
      </InfoSection>
    </InfoPage>
  );
}
