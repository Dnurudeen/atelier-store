import { cn } from "@/lib/utils";

type PageLoaderProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export function PageLoader({
  label = "Loading Atelier",
  className,
  compact = false,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden",
        compact ? "min-h-[40vh] py-16" : "min-h-[70vh] py-24",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(247,242,240)_0%,transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="relative flex flex-col items-center gap-6 animate-fade-up">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="atelier-loader-ring absolute inset-0 rounded-full border border-burgundy/15" />
          <span className="atelier-loader-ring atelier-loader-ring-delay absolute inset-2 rounded-full border border-crimson/25" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-burgundy text-sm font-medium tracking-[0.18em] text-white shadow-[0_12px_40px_-16px_rgba(92,10,20,0.65)]">
            A
          </span>
        </div>

        <div className="text-center">
          <p className="font-display text-2xl text-burgundy tracking-tight">{label}</p>
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
            <span className="atelier-loader-dot h-1.5 w-1.5 rounded-full bg-crimson" />
            <span className="atelier-loader-dot atelier-loader-dot-2 h-1.5 w-1.5 rounded-full bg-crimson" />
            <span className="atelier-loader-dot atelier-loader-dot-3 h-1.5 w-1.5 rounded-full bg-crimson" />
          </div>
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
