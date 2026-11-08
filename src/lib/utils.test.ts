import { describe, expect, it } from "vitest";
import { cn, formatNaira, formatRating, slugify } from "./utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-sm")).toContain("px-4");
    expect(cn("px-2", "px-4")).not.toContain("px-2");
  });
});

describe("formatNaira", () => {
  it("formats numbers and numeric strings as NGN", () => {
    expect(formatNaira(50000)).toMatch(/50,?000/);
    expect(formatNaira("12500")).toMatch(/12,?500/);
  });

  it("falls back to zero for invalid values", () => {
    expect(formatNaira(Number.NaN)).toMatch(/0/);
    expect(formatNaira("abc")).toMatch(/0/);
  });
});

describe("formatRating", () => {
  it("formats valid ratings and returns null for empty values", () => {
    expect(formatRating(4.56)).toBe("4.6");
    expect(formatRating("4.2", 1)).toBe("4.2");
    expect(formatRating(0)).toBeNull();
    expect(formatRating(null)).toBeNull();
    expect(formatRating(undefined)).toBeNull();
    expect(formatRating("bad")).toBeNull();
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("  Lagos Twilight Canvas! ")).toBe("lagos-twilight-canvas");
    expect(slugify("Adebayo's Studio")).toBe("adebayos-studio");
  });
});
