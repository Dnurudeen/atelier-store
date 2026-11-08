import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: vi.fn(),
  };
});

import { api, getToken } from "@/lib/api";
import { useAuthStore } from "./auth";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, loading: false });
    window.localStorage.clear();
    vi.mocked(api).mockReset();
  });

  it("logs in and stores the session token", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      data: {
        user: {
          id: 1,
          name: "Ada",
          email: "ada@atelier.test",
          roles: ["customer"],
        },
        token: "tok_login",
      },
    });

    await useAuthStore.getState().login("ada@atelier.test", "password");

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("ada@atelier.test");
    expect(state.token).toBe("tok_login");
    expect(getToken()).toBe("tok_login");
    expect(state.loading).toBe(false);
  });

  it("registers a vendor session", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      data: {
        user: {
          id: 2,
          name: "Kemi",
          email: "kemi@atelier.test",
          roles: ["vendor"],
        },
        token: "tok_reg",
      },
    });

    await useAuthStore.getState().register({
      name: "Kemi",
      email: "kemi@atelier.test",
      password: "secret12",
      password_confirmation: "secret12",
      role: "vendor",
    });

    expect(useAuthStore.getState().token).toBe("tok_reg");
    expect(useAuthStore.getState().user?.roles).toContain("vendor");
  });

  it("fetchMe refreshes the user and clears on failure", async () => {
    useAuthStore.getState().setSession(
      { id: 1, name: "Ada", email: "ada@atelier.test", roles: ["customer"] },
      "tok_me"
    );

    vi.mocked(api).mockResolvedValueOnce({
      data: { id: 1, name: "Ada Updated", email: "ada@atelier.test", roles: ["customer"] },
    });
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().user?.name).toBe("Ada Updated");

    vi.mocked(api).mockRejectedValueOnce({ message: "Unauthenticated." });
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().user).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("logout clears local session even if the api fails", async () => {
    useAuthStore.getState().setSession(
      { id: 1, name: "Ada", email: "ada@atelier.test", roles: ["customer"] },
      "tok_out"
    );
    vi.mocked(api).mockRejectedValueOnce({ message: "offline" });

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(getToken()).toBeNull();
  });
});
