"use client";

import type { ReactNode } from "react";
import { InfoPage } from "@/components/layout/info-page";

/** Client-component wrapper so interactive pages (e.g. Contact) can reuse the help layout. */
export function InfoPageClient({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <InfoPage title={title} intro={intro} current="/contact">
      {children}
    </InfoPage>
  );
}
