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
    default: "Atelier Nigeria | Handmade Marketplace",
    template: "%s | Atelier Nigeria",
  },
  description:
    "Buy and sell fine art, fashion, ceramics, leather and home decor from Nigerian makers.",
  metadataBase: new URL("https://www.atelierstore.studio"),
  openGraph: {
    title: "Atelier Nigeria",
    description: "Handmade work from makers across Nigeria.",
    siteName: "Atelier Nigeria",
    locale: "en_NG",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#4A0C14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
