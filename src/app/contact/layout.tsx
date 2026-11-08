import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Atelier Nigeria team.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
