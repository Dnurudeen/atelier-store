import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Returns & refunds" };

export default function ReturnsPage() {
  return (
    <InfoPage title="Returns & refunds" intro="Changed your mind or received the wrong item? Here's how returns work." current="/returns">
      <InfoSection title="7-day return window">
        <p>You can request a return within <strong>7 days of delivery</strong> for eligible items. Items must be unused, in their original packaging, with all tags and accessories.</p>
      </InfoSection>
      <InfoSection title="How to request a return">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Open <Link href="/account/orders" className="text-burgundy underline">My Account → Orders</Link> and choose the delivered order.
          </li>
          <li>Select the item, tell us the reason and add photos if the item is damaged or not as described.</li>
          <li>The seller reviews your request within 2 business days. If they decline and you disagree, you can escalate it to Atelier.</li>
          <li>Once the item is received back and checked, your refund is issued.</li>
        </ol>
      </InfoSection>
      <InfoSection title="Refunds">
        <p>Refunds go back to your original payment method within 5–10 business days after approval. Delivery fees are refunded when the item was damaged, defective or wrong.</p>
      </InfoSection>
      <InfoSection title="Items that can't be returned">
        <ul className="list-disc space-y-1 pl-5">
          <li>Custom-made or personalised pieces made to your order</li>
          <li>Perishable goods, beauty and personal-care items once opened</li>
          <li>Underwear and swimwear for hygiene reasons</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
