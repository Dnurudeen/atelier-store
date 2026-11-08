"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <label className="block space-y-1.5">
        {label && (
          <span className="text-sm font-medium text-foreground/80">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-burgundy focus:ring-2 focus:ring-burgundy/15",
            error && "border-crimson focus:border-crimson focus:ring-crimson/15",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-crimson">{error}</span>}
      </label>
    );
  }
);

Input.displayName = "Input";
