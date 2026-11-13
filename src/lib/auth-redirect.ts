import type { User } from "@/lib/api";

/**
 * Only allow in-app relative paths as post-login destinations.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com") and backslash tricks ("/\\evil.com").
 */
export function safeNext(next?: string | null): string | null {
  if (!next) return null;
  const value = next.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (/^\/(login|register|forgot-password|reset-password)(\/|\?|$)/.test(value)) return null;
  return value;
}

export function postAuthPath(user: User | null, options?: { next?: string | null; asVendor?: boolean }) {
  if (!user) return "/login";
  const next = safeNext(options?.next);

  if (user.needs_onboarding) {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (options?.asVendor || user.roles?.includes("vendor")) params.set("role", "vendor");
    const qs = params.toString();
    return qs ? `/onboarding?${qs}` : "/onboarding";
  }

  if (next) return next;

  const roles = user.roles || [];
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("vendor")) {
    const store = user.store;
    if (!store?.bio && !store?.location) return "/vendor/onboarding";
    return "/vendor";
  }
  return "/account";
}
