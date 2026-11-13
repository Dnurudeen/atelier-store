import { describe, expect, it } from "vitest";
import { addBusinessDays, deliveryWindow, isValidNigerianPhone, NIGERIAN_STATES } from "./nigeria";

describe("nigeria helpers", () => {
  it("lists all 36 states plus the FCT", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
  });

  it("estimates faster delivery within the same state and region", () => {
    expect(deliveryWindow("Ikeja, Lagos", "Lagos")).toEqual([1, 3]);
    expect(deliveryWindow("Lagos", "Ogun")).toEqual([2, 4]);
    expect(deliveryWindow("Lagos", "Kano")).toEqual([4, 8]);
    expect(deliveryWindow("Lagos", "Enugu")).toEqual([3, 6]);
  });

  it("skips weekends when adding business days", () => {
    const friday = new Date("2026-11-13T10:00:00");
    expect(addBusinessDays(friday, 1).getDay()).toBe(1); // Monday
  });

  it("validates Nigerian mobile numbers", () => {
    expect(isValidNigerianPhone("0803 123 4567")).toBe(true);
    expect(isValidNigerianPhone("+2348031234567")).toBe(true);
    expect(isValidNigerianPhone("0801")).toBe(false);
    expect(isValidNigerianPhone("0603 123 4567")).toBe(false);
  });
});
