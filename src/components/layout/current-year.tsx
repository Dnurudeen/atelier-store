"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Current year without a hydration mismatch (server renders the build-time year). */
export function CurrentYear() {
  const year = useSyncExternalStore(noop, () => new Date().getFullYear(), () => 2026);
  return <>{year}</>;
}
