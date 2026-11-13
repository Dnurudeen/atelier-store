import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 12,
  className,
}: {
  value?: number | string | null;
  size?: number;
  className?: string;
}) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className={cn("inline-flex items-center gap-px", className)} role="img" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 fill-border text-border" aria-hidden />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="fill-amber-400 text-amber-400" aria-hidden />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
