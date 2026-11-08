import { ReactNode } from "react";
import { DashboardShell, type DashNavItem } from "@/components/layout/dashboard-shell";
import { Home, Package, Heart, MapPin, User } from "lucide-react";

const nav: DashNavItem[] = [
  { href: "/account", label: "Overview", icon: <Home size={16} /> },
  { href: "/account/orders", label: "Orders", icon: <Package size={16} /> },
  { href: "/account/wishlist", label: "Wishlist", icon: <Heart size={16} /> },
  { href: "/account/addresses", label: "Addresses", icon: <MapPin size={16} /> },
  { href: "/account/profile", label: "Profile", icon: <User size={16} /> },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="My Account" nav={nav}>
      {children}
    </DashboardShell>
  );
}
