"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK = "/media/fallback.jpg";

/**
 * Absolute URLs (vendor uploads on the API host, vendor CDNs) are served as-is:
 * uploads are already resized to WebP by the API, and Next's optimizer refuses
 * private/local hosts and any host not listed in remotePatterns.
 */
function isExternal(src: string) {
  return /^https?:\/\//i.test(src);
}

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
  const shown = failed ? fallbackSrc : current;
  const unoptimized = rest.unoptimized ?? isExternal(shown);

  if (fill) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", frameClassName)}>
        <Image
          {...rest}
          src={shown}
          alt={alt}
          unoptimized={unoptimized}
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
      src={shown}
      alt={alt}
      unoptimized={unoptimized}
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
