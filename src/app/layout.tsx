import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/layout/app-chrome";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Atelier Nigeria — Handcrafted Marketplace",
    template: "%s | Atelier Nigeria",
  },
  description:
    "Nigeria's multivendor marketplace for fine art, fashion, ceramics, leather, and home decor — empowering artisans to sell with confidence.",
  metadataBase: new URL("https://www.atelierstore.studio"),
  openGraph: {
    title: "Atelier Nigeria",
    description: "Handcrafted excellence from Nigerian makers.",
    siteName: "Atelier Nigeria",
    locale: "en_NG",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#5C0A14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
