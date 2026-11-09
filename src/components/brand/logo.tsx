import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "header" | "footer";
  className?: string;
  href?: string;
  priority?: boolean;
};

/**
 * Uses tightly-cropped logo assets (empty canvas padding removed).
 * Header: dark mark for light backgrounds.
 * Footer: light mark for burgundy backgrounds.
 */
export function BrandLogo({
  variant = "header",
  className,
  href = "/",
  priority,
}: BrandLogoProps) {
  const src = variant === "footer" ? "/brand/logo-footer-hd.png" : "/brand/logo-header-hd.png";

  const image = (
    <span
      className={cn(
        "relative inline-block",
        variant === "footer" ? "h-9 md:h-14" : "h-8 md:h-12",
        className
      )}
    >
      <Image
        src={src}
        alt="Atelier Nigeria"
        width={480}
        height={170}
        priority={priority}
        className="h-full w-auto max-w-[140px] object-contain object-left md:max-w-[220px]"
        style={{ width: "auto", height: "100%" }}
      />
    </span>
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Atelier Nigeria home">
      {image}
    </Link>
  );
}
