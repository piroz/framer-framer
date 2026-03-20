import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlueskyProvider } from "../../src/providers/bluesky.js";

describe("BlueskyProvider", () => {
  const provider = new BlueskyProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:abc123/app.bsky.feed.post/3jxmszpoehs27"><p>Hello Bluesky!</p></blockquote>',
            title: "Hello Bluesky!",
            author_name: "bsky.app",
            author_url: "https://bsky.app/profile/bsky.app",
            width: 550,
            height: null,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("match", () => {
    it("matches bsky.app profile post URLs", () => {
      expect(provider.match("https://bsky.app/profile/bsky.app/post/3jxmszpoehs27")).toBe(true);
      expect(provider.match("https://bsky.app/profile/did:plc:abc123/post/3jxmszpoehs27")).toBe(
        true,
      );
    });

    it("does not match unrelated URLs", () => {
      expect(provider.match("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
      expect(provider.match("https://bsky.app/profile/bsky.app")).toBe(false);
      expect(provider.match("https://example.com")).toBe(false);
    });
  });

  it("resolves a Bluesky post URL", async () => {
    const result = await provider.resolve("https://bsky.app/profile/bsky.app/post/3jxmszpoehs27");

    expect(result.provider).toBe("bluesky");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("bluesky-embed");
    expect(result.author_name).toBe("bsky.app");
    expect(result.url).toBe("https://bsky.app/profile/bsky.app/post/3jxmszpoehs27");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://bsky.app/profile/bsky.app/post/3jxmszpoehs27", {
      maxWidth: 400,
      maxHeight: 600,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=400");
    expect(fetchCall).toContain("maxheight=600");
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(
      provider.resolve("https://bsky.app/profile/bsky.app/post/invalid"),
    ).rejects.toThrow("bluesky oEmbed request failed: 404 Not Found");
  });
});
