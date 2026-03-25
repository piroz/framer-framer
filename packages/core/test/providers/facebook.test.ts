import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookProvider } from "../../src/providers/facebook.js";

describe("FacebookProvider", () => {
  const provider = new FacebookProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<div id="fb-root"></div><script async="1" defer="1" crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script><div class="fb-post" data-href="https://www.facebook.com/user/posts/123"></div>',
            width: 552,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws without access token", async () => {
    await expect(provider.resolve("https://www.facebook.com/user/posts/123456")).rejects.toThrow(
      "facebook oEmbed requires a Meta access token",
    );
    await expect(provider.resolve("https://www.facebook.com/user/posts/123456")).rejects.toThrow(
      "auth.meta.accessToken",
    );
  });

  it("resolves with access token", async () => {
    const result = await provider.resolve("https://www.facebook.com/user/posts/123456", {
      meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
    });

    expect(result.provider).toBe("facebook");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("fb-post");

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("access_token=APP_ID%7CCLIENT_TOKEN");
    expect(fetchCall).toContain("graph.facebook.com");
  });

  it("uses video endpoint for video URLs", async () => {
    await provider.resolve("https://fb.watch/abc123/", {
      meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("oembed_video");
  });

  it("uses post endpoint for post URLs", async () => {
    await provider.resolve("https://www.facebook.com/user/posts/123", {
      meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("oembed_post");
  });
});
