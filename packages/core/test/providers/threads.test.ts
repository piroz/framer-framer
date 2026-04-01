import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadsProvider } from "../../src/providers/threads.js";

describe("ThreadsProvider", () => {
  const provider = new ThreadsProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<blockquote class="text-post-media" data-text-post-permalink="https://www.threads.net/@zuck/post/CuXFPIvSEvG"><a href="https://www.threads.net/@zuck/post/CuXFPIvSEvG">Post by @zuck</a></blockquote><script async src="https://www.threads.net/embed.js"></script>',
            width: 550,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches threads.net/@user/post/ URLs", () => {
    expect(provider.match("https://www.threads.net/@zuck/post/CuXFPIvSEvG")).toBe(true);
    expect(provider.match("https://threads.net/@user/post/abc123")).toBe(true);
  });

  it("matches threads.net/t/ URLs", () => {
    expect(provider.match("https://www.threads.net/t/CuXFPIvSEvG")).toBe(true);
    expect(provider.match("https://threads.net/t/abc123")).toBe(true);
  });

  it("does not match non-Threads URLs", () => {
    expect(provider.match("https://www.instagram.com/p/abc123/")).toBe(false);
    expect(provider.match("https://example.com")).toBe(false);
  });

  it("throws without access token", async () => {
    await expect(
      provider.resolve("https://www.threads.net/@zuck/post/CuXFPIvSEvG"),
    ).rejects.toThrow("threads oEmbed requires a Meta access token");
  });

  it("resolves with access token", async () => {
    const result = await provider.resolve("https://www.threads.net/@zuck/post/CuXFPIvSEvG", {
      auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
    });

    expect(result.provider).toBe("threads");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("text-post-media");

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("access_token=APP_ID%7CCLIENT_TOKEN");
    expect(fetchCall).toContain("threads_oembed");
  });
});
