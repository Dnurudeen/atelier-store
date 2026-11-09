"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

const CHROMELESS_PREFIXES = ["/vendor", "/admin", "/account", "/login", "/register", "/onboarding", "/forgot-password"];

function isChromeless(pathname: string) {
  return CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideChrome = isChromeless(pathname);

  if (hideChrome) {
    return (
      <>
        {children}
        <CartDrawer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileTabBar />
      <CartDrawer />
    </>
  );
}
