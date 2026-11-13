"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatCountdown(ms: number) {
  const { days, hours, minutes, seconds } = parts(ms);
  return `${days > 0 ? `${days}d : ` : ""}${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/** Live "ends in" timer. Renders nothing until mounted to avoid hydration mismatch. */
export function Countdown({ endsAt, className, label = "Time left:" }: { endsAt: string; className?: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  if (now === null) return null;
  const remaining = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;

  return (
    <span className={className} aria-live="off">
      {label && <span className="mr-1 font-normal">{label}</span>}
      <span className="font-semibold tabular-nums">{formatCountdown(remaining)}</span>
    </span>
  );
}
