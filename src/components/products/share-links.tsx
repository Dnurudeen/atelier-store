"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ShareLinks({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${path}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copy() {
    const full = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1 text-muted">
        <Share2 size={14} />
        Share
      </span>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-border px-3 py-1 font-medium text-burgundy hover:border-burgundy"
      >
        WhatsApp
      </a>
      <a
        href={facebook}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-border px-3 py-1 font-medium text-burgundy hover:border-burgundy"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-medium text-burgundy hover:border-burgundy"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
