"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { passwordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

type Props = Omit<InputProps, "type" | "trailing"> & {
  /** Show the strength meter and rules (for new passwords). */
  showStrength?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(({ showStrength, value, hint, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(String(value ?? ""));

  return (
    <div>
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        value={value}
        hint={showStrength ? undefined : hint}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded text-muted hover:text-burgundy"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
      {showStrength && !props.error && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full bg-border transition-colors",
                  String(value ?? "").length > 0 && i < strength.score && strength.color
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            {String(value ?? "").length === 0 ? (
              "At least 8 characters, with letters and numbers."
            ) : (
              <>
                <span className="font-medium text-foreground">{strength.label}.</span> {strength.tip}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
