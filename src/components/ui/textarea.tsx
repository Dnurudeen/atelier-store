"use client";

import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <label className="block space-y-1.5">
        {label && (
          <span className="text-[13px] font-medium text-foreground/80">{label}{props.required && <span className="ml-0.5 text-crimson">*</span>}</span>
        )}
        <textarea
          ref={ref}
          className={cn(
            "min-h-28 w-full rounded-md border border-border bg-white px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-burgundy focus:ring-2 focus:ring-burgundy/15",
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

Textarea.displayName = "Textarea";
