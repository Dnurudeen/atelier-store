export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tip: string;
  color: string;
  /** Meets the server rule: 8+ chars with at least one letter and one number. */
  valid: boolean;
};

export function meetsPasswordRule(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function passwordStrength(password: string): PasswordStrength {
  const valid = meetsPasswordRule(password);
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score++;
  if (!valid) score = Math.min(score, 1);

  const levels: Record<number, Omit<PasswordStrength, "score" | "valid">> = {
    0: { label: "Too weak", tip: "Use at least 8 characters.", color: "bg-crimson" },
    1: { label: "Weak", tip: "Mix letters and numbers, 8+ characters.", color: "bg-crimson" },
    2: { label: "Fair", tip: "Add upper-case letters or a symbol.", color: "bg-amber-500" },
    3: { label: "Good", tip: "Longer passwords are even safer.", color: "bg-emerald-500" },
    4: { label: "Strong", tip: "Great password.", color: "bg-emerald-600" },
  };

  return { score: score as PasswordStrength["score"], valid, ...levels[score] };
}
