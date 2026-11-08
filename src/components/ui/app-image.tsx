"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK = "/media/fallback.jpg";

type AppImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  frameClassName?: string;
};

/**
 * Resilient marketplace image:
 * - Guarantees a relative positioned frame for `fill`
 * - Swaps to a local fallback when remote/local src fails
 * - Uses object-cover by default so cards stay consistent
 */
export function AppImage({
  src,
  alt,
  fallbackSrc = FALLBACK,
  className,
  frameClassName,
  fill,
  sizes,
  priority,
  ...rest
}: AppImageProps) {
  const initial = src && String(src).trim() ? String(src) : fallbackSrc;
  const [current, setCurrent] = useState(initial);
  const [failed, setFailed] = useState(false);

  if (fill) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", frameClassName)}>
        <Image
          {...rest}
          src={failed ? fallbackSrc : current}
          alt={alt}
          fill
          sizes={sizes || "(max-width:768px) 100vw, 33vw"}
          priority={priority}
          className={cn("object-cover", className)}
          onError={() => {
            if (!failed) {
              setFailed(true);
              setCurrent(fallbackSrc);
            }
          }}
        />
      </div>
    );
  }

  return (
    <Image
      {...rest}
      src={failed ? fallbackSrc : current}
      alt={alt}
      className={cn("object-contain", className)}
      priority={priority}
      onError={() => {
        if (!failed) {
          setFailed(true);
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}
