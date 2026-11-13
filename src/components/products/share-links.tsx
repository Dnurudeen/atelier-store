"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

function fullUrl(path: string) {
  return `${window.location.origin}${path}`;
}

/** Jumia-style round share buttons. URLs are built on click so SSR and client markup match. */
export function ShareLinks({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  function open(kind: "whatsapp" | "facebook" | "x") {
    const url = fullUrl(path);
    const href = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    }[kind];
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl(path));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-border text-[11px] font-bold text-foreground/70 hover:border-burgundy hover:text-burgundy";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Share</span>
      <button type="button" onClick={() => open("whatsapp")} className={btn} aria-label="Share on WhatsApp">
        WA
      </button>
      <button type="button" onClick={() => open("facebook")} className={btn} aria-label="Share on Facebook">
        f
      </button>
      <button type="button" onClick={() => open("x")} className={btn} aria-label="Share on X">
        X
      </button>
      <button type="button" onClick={() => void copy()} className={btn} aria-label={copied ? "Link copied" : "Copy link"}>
        {copied ? <Check size={14} /> : <Link2 size={14} />}
      </button>
    </div>
  );
}
