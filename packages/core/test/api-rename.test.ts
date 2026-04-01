import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookProvider } from "../src/providers/facebook.js";

describe("auth.meta.accessToken", () => {
  const provider = new FacebookProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<div class="fb-post"></div>',
            width: 552,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts auth.meta.accessToken", async () => {
    const result = await provider.resolve("https://www.facebook.com/user/posts/123", {
      auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
    });

    expect(result.provider).toBe("facebook");
    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("access_token=APP_ID%7CCLIENT_TOKEN");
  });

  it("throws when auth.meta is not provided", async () => {
    await expect(provider.resolve("https://www.facebook.com/user/posts/123")).rejects.toThrow(
      "auth.meta.accessToken",
    );
  });
});

describe("resolve() export removed in v4", () => {
  it("resolve is no longer exported", async () => {
    const exports = await import("../src/index.js");
    expect("resolve" in exports).toBe(false);
  });
});
