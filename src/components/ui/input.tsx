"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode, forwardRef, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  /** Element rendered inside the field on the right (e.g. a show-password toggle). */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, trailing, id, required, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-foreground/80">
            {label}
            {required && <span className="ml-0.5 text-crimson">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-11 w-full rounded-md border border-border bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/80 focus:border-burgundy focus:ring-2 focus:ring-burgundy/15 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
              trailing && "pr-11",
              error && "border-crimson focus:border-crimson focus:ring-crimson/15",
              className
            )}
            {...props}
          />
          {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-crimson">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
