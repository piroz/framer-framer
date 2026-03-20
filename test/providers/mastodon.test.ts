import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MastodonProvider } from "../../src/providers/mastodon.js";

describe("MastodonProvider", () => {
  const provider = new MastodonProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<iframe src="https://mastodon.social/@Gargron/109370844932549021/embed" class="mastodon-embed" style="max-width: 100%; border: 0" width="400" allowfullscreen="allowfullscreen"></iframe><script src="https://mastodon.social/embed.js" async="async"></script>',
            title: "Test post content",
            author_name: "Eugen Rochko",
            author_url: "https://mastodon.social/@Gargron",
            provider_name: "mastodon.social",
            width: 400,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("match", () => {
    it("matches /@user/id URLs", () => {
      expect(provider.match("https://mastodon.social/@Gargron/109370844932549021")).toBe(true);
      expect(provider.match("https://mstdn.jp/@user/123456789")).toBe(true);
      expect(provider.match("https://pawoo.net/@artist/987654321")).toBe(true);
    });

    it("matches /users/*/statuses/* URLs", () => {
      expect(
        provider.match("https://mastodon.social/users/Gargron/statuses/109370844932549021"),
      ).toBe(true);
      expect(provider.match("https://mstdn.jp/users/user/statuses/123456789")).toBe(true);
    });

    it("matches unknown instance URLs", () => {
      expect(provider.match("https://unknown-instance.example.com/@user/12345")).toBe(true);
      expect(provider.match("https://unknown-instance.example.com/users/user/statuses/12345")).toBe(
        true,
      );
    });

    it("does not match URLs without numeric post ID", () => {
      expect(provider.match("https://mastodon.social/@Gargron")).toBe(false);
      expect(provider.match("https://mastodon.social/@Gargron/with/extra/path")).toBe(false);
    });

    it("does not match unrelated URLs", () => {
      expect(provider.match("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
      expect(provider.match("https://example.com")).toBe(false);
      expect(provider.match("https://twitter.com/user/status/12345")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("resolves a known instance URL via direct endpoint", async () => {
      const result = await provider.resolve("https://mastodon.social/@Gargron/109370844932549021");

      expect(result.provider).toBe("mastodon");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.title).toBe("Test post content");
      expect(result.author_name).toBe("Eugen Rochko");
      expect(result.url).toBe("https://mastodon.social/@Gargron/109370844932549021");

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("mastodon.social/api/oembed");
    });

    it("resolves a known instance with /users/*/statuses/* URL", async () => {
      const result = await provider.resolve("https://mstdn.jp/users/user/statuses/123456789");

      expect(result.provider).toBe("mastodon");
      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("mstdn.jp/api/oembed");
    });

    it("resolves unknown instance via oEmbed discovery", async () => {
      const discoveryHtml =
        '<html><head><link rel="alternate" type="application/json+oembed" href="https://unknown.example.com/api/oembed?url=https%3A%2F%2Funknown.example.com%2F%40user%2F12345" /></head></html>';

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(discoveryHtml),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                type: "rich",
                html: '<iframe src="https://unknown.example.com/@user/12345/embed" class="mastodon-embed"></iframe>',
                title: "A post on unknown instance",
                author_name: "User",
                provider_name: "unknown.example.com",
              }),
          }),
      );

      const result = await provider.resolve("https://unknown.example.com/@user/12345");

      expect(result.provider).toBe("mastodon");
      expect(result.title).toBe("A post on unknown instance");
    });

    it("throws when discovery fails for unknown instance", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("<html><head></head><body></body></html>"),
        }),
      );

      await expect(provider.resolve("https://unknown.example.com/@user/12345")).rejects.toThrow(
        "mastodon oEmbed discovery failed for unknown.example.com",
      );
    });

    it("passes maxWidth/maxHeight to the API for known instances", async () => {
      await provider.resolve("https://mastodon.social/@Gargron/109370844932549021", {
        maxWidth: 640,
        maxHeight: 480,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("maxwidth=640");
      expect(fetchCall).toContain("maxheight=480");
    });

    it("throws on non-OK response for known instances", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      await expect(
        provider.resolve("https://mastodon.social/@Gargron/999999999999"),
      ).rejects.toThrow("mastodon oEmbed request failed: 404 Not Found");
    });
  });
});
