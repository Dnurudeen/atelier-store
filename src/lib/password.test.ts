import { describe, expect, it } from "vitest";
import { meetsPasswordRule, passwordStrength } from "./password";

describe("password rules", () => {
  it("matches the server rule", () => {
    expect(meetsPasswordRule("short1")).toBe(false);
    expect(meetsPasswordRule("onlyletters")).toBe(false);
    expect(meetsPasswordRule("12345678")).toBe(false);
    expect(meetsPasswordRule("secret123")).toBe(true);
  });

  it("never rates an invalid password above weak", () => {
    expect(passwordStrength("ABCDEFGHIJKLmnop!").score).toBeLessThanOrEqual(1);
  });

  it("rewards length, case mix and symbols", () => {
    expect(passwordStrength("secret123").score).toBe(2);
    expect(passwordStrength("Secret123").score).toBe(3);
    expect(passwordStrength("Secret123!xyz").score).toBe(4);
  });
});
