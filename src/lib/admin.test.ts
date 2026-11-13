import { describe, expect, it } from "vitest";
import { qs } from "./admin";

describe("admin query string helper", () => {
  it("drops empty values and keeps zero", () => {
    expect(qs({ q: "", status: "pending", page: 2, refunds: false, rating: 0, x: null })).toBe("?status=pending&page=2&rating=0");
    expect(qs({})).toBe("");
  });
});
