import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy" intro="How we collect, use and protect your personal data (NDPA 2023)." current="/privacy">
      <p className="rounded-md bg-surface-warm px-3 py-2 text-[13px] text-muted">
        This is a general template. Have it reviewed against the Nigeria Data Protection Act before launch.
      </p>
      <InfoSection title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details: name, email, phone number and password (stored hashed).</li>
          <li>Order details: delivery addresses, items purchased and payment status. Card details are handled by Paystack and never reach our servers.</li>
          <li>Usage data such as pages viewed, to keep the service secure and improve it.</li>
        </ul>
      </InfoSection>
      <InfoSection title="How we use it">
        <p>To process and deliver your orders, share the delivery details a seller needs to ship your package, send order updates, prevent fraud, and (only if you opt in) send marketing emails.</p>
      </InfoSection>
      <InfoSection title="Your rights">
        <p>You can view and update your details in My Account, unsubscribe from marketing at any time, and close your account. Closing your account removes your personal details; order records are kept anonymised for accounting.</p>
      </InfoSection>
      <InfoSection title="Contact">
        <p>For privacy questions, contact us through the Contact page.</p>
      </InfoSection>
    </InfoPage>
  );
}
