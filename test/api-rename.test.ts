import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { embed, resolve } from "../src/index.js";
import { FacebookProvider } from "../src/providers/facebook.js";

describe("resolve() deprecated export", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
            provider_name: "YouTube",
            title: "Test Video",
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolve() is exported and callable", () => {
    expect(typeof resolve).toBe("function");
  });

  it("resolve() returns the same result as embed()", async () => {
    const url = "https://www.youtube.com/watch?v=abc";
    const embedResult = await embed(url);
    const resolveResult = await resolve(url);
    expect(resolveResult).toEqual(embedResult);
  });
});

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

  it("still accepts legacy meta.accessToken", async () => {
    const result = await provider.resolve("https://www.facebook.com/user/posts/123", {
      meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
    });

    expect(result.provider).toBe("facebook");
    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("access_token=APP_ID%7CCLIENT_TOKEN");
  });

  it("prefers auth.meta over legacy meta", async () => {
    const result = await provider.resolve("https://www.facebook.com/user/posts/123", {
      auth: { meta: { accessToken: "NEW_TOKEN" } },
      meta: { accessToken: "OLD_TOKEN" },
    });

    expect(result.provider).toBe("facebook");
    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("access_token=NEW_TOKEN");
    expect(fetchCall).not.toContain("OLD_TOKEN");
  });

  it("throws when neither auth.meta nor meta is provided", async () => {
    await expect(provider.resolve("https://www.facebook.com/user/posts/123")).rejects.toThrow(
      "auth.meta.accessToken",
    );
  });
});
