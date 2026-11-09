"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"customer" | "vendor" | "admin">;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (roles?.length) {
      const userRoles = user.roles || [];
      const ok = roles.some((role) => userRoles.includes(role));
      if (!ok) {
        if (userRoles.includes("admin")) router.replace("/admin");
        else if (userRoles.includes("vendor")) router.replace("/vendor");
        else router.replace("/account");
      }
    }
  }, [hydrated, token, user, roles, router, pathname]);

  if (!hydrated || loading || !token || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session…
      </div>
    );
  }

  if (roles?.length) {
    const userRoles = user.roles || [];
    const ok = roles.some((role) => userRoles.includes(role));
    if (!ok) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
          Redirecting…
        </div>
      );
    }
  }

  return <>{children}</>;
}
