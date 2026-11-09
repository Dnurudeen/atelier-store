import type { User } from "@/lib/api";

export function postAuthPath(user: User | null, options?: { next?: string | null; asVendor?: boolean }) {
  if (!user) return "/login";

  if (user.needs_onboarding) {
    const params = new URLSearchParams();
    if (options?.next) params.set("next", options.next);
    if (options?.asVendor || user.roles?.includes("vendor")) params.set("role", "vendor");
    const qs = params.toString();
    return qs ? `/onboarding?${qs}` : "/onboarding";
  }

  if (options?.next) return options.next;

  const roles = user.roles || [];
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("vendor")) {
    const store = user.store;
    if (!store?.bio && !store?.location) return "/vendor/onboarding";
    return "/vendor";
  }
  return "/account";
}
