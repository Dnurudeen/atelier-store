import { describe, expect, it } from "vitest";
import { postAuthPath } from "./auth-redirect";
import type { User } from "./api";

function user(partial: Partial<User>): User {
  return {
    id: 1,
    name: "Ada",
    email: "ada@atelier.test",
    roles: ["customer"],
    needs_onboarding: false,
    ...partial,
  };
}

describe("postAuthPath", () => {
  it("sends incomplete Google users to onboarding", () => {
    expect(postAuthPath(user({ needs_onboarding: true }), { next: "/checkout" })).toBe(
      "/onboarding?next=%2Fcheckout"
    );
  });

  it("routes admins and vendors after onboarding", () => {
    expect(postAuthPath(user({ roles: ["admin"] }))).toBe("/admin");
    expect(
      postAuthPath(
        user({
          roles: ["vendor"],
          store: {
            id: 1,
            name: "Studio",
            slug: "studio",
            status: "pending",
            bio: "Clay",
            location: "Lagos",
          },
        })
      )
    ).toBe("/vendor");
  });

  it("honors next for completed customers", () => {
    expect(postAuthPath(user({}), { next: "/checkout" })).toBe("/checkout");
  });
});
