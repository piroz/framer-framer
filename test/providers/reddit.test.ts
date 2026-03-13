import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedditProvider } from "../../src/providers/reddit.js";

describe("RedditProvider", () => {
  const provider = new RedditProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<blockquote class="reddit-embed-bq"><a href="https://www.reddit.com/r/typescript/comments/abc123/my_post/">My Post</a></blockquote>',
            title: "My Post",
            author_name: "u/testuser",
            author_url: "https://www.reddit.com/user/testuser",
            thumbnail_url:
              "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
            width: 640,
            height: 480,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a Reddit post URL", async () => {
    const result = await provider.resolve(
      "https://www.reddit.com/r/typescript/comments/abc123/my_post/",
    );

    expect(result.provider).toBe("reddit");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("reddit-embed-bq");
    expect(result.title).toBe("My Post");
    expect(result.author_name).toBe("u/testuser");
    expect(result.url).toBe("https://www.reddit.com/r/typescript/comments/abc123/my_post/");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://www.reddit.com/r/typescript/comments/abc123/my_post/", {
      maxWidth: 500,
      maxHeight: 300,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=500");
    expect(fetchCall).toContain("maxheight=300");
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
      provider.resolve("https://www.reddit.com/r/test/comments/invalid/post/"),
    ).rejects.toThrow("reddit oEmbed request failed: 404 Not Found");
  });

  describe("match", () => {
    it("matches reddit.com post URLs", () => {
      expect(provider.match("https://www.reddit.com/r/typescript/comments/abc123/my_post/")).toBe(
        true,
      );
      expect(provider.match("https://reddit.com/r/programming/comments/xyz789/title/")).toBe(true);
      expect(provider.match("http://reddit.com/r/test/comments/123/post")).toBe(true);
    });

    it("does not match non-post Reddit URLs", () => {
      expect(provider.match("https://www.reddit.com/r/typescript/")).toBe(false);
      expect(provider.match("https://www.reddit.com/")).toBe(false);
      expect(provider.match("https://www.reddit.com/user/testuser")).toBe(false);
    });

    it("does not match non-Reddit URLs", () => {
      expect(provider.match("https://www.youtube.com/watch?v=abc")).toBe(false);
    });
  });
});
