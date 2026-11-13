"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

/** Pages with their own full-screen layout (dashboards, auth, checkout). */
const CHROMELESS_PREFIXES = [
  "/vendor",
  "/admin",
  "/account",
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/checkout",
];

/** Pages that show their own sticky action bar on phones instead of the tab bar. */
const NO_TAB_BAR_PREFIXES = ["/product/", "/cart"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (matches(pathname, CHROMELESS_PREFIXES) && pathname !== "/checkout/success") return <>{children}</>;

  const showTabBar = !matches(pathname, NO_TAB_BAR_PREFIXES);

  return (
    <>
      <Header />
      <main className={showTabBar ? "pb-mobile-tab flex-1 md:pb-0" : "flex-1"}>{children}</main>
      <Footer />
      {showTabBar && <MobileTabBar />}
    </>
  );
}
