import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getToken, setToken } from "./api";

describe("token helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and clears atelier_token", () => {
    expect(getToken()).toBeNull();
    setToken("tok_123");
    expect(getToken()).toBe("tok_123");
    setToken(null);
    expect(getToken()).toBeNull();
  });
});

describe("api client", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends json requests with bearer token and returns parsed data", async () => {
    setToken("session-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await api<{ data: { ok: boolean } }>("/products", {
      method: "POST",
      body: { q: "canvas" },
    });

    expect(result.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/products");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer session-token");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify({ q: "canvas" }));
  });

  it("throws ApiError with validation errors on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "The given data was invalid.",
          errors: { email: ["Taken"] },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(api("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      message: "The given data was invalid.",
      errors: { email: ["Taken"] },
    });
  });

  it("allows explicitly disabling the token", async () => {
    setToken("session-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: true }), { status: 200 })
    );

    await api("/auth/login", { method: "POST", body: {}, token: null });
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
