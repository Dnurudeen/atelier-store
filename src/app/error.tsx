"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-[var(--page-bg)] py-16">
      <div className="container-atelier max-w-lg">
        <div className="rounded-md bg-white p-8 text-center">
          <h1 className="font-display text-2xl text-burgundy">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            We hit a snag loading this page. Please try again — if it keeps happening, contact our support team.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex items-center gap-2 rounded-md bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-hover"
            >
              <RefreshCw size={15} /> Try again
            </button>
            <Link href="/" className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:border-burgundy">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
