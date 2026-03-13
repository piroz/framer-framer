import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlideShareProvider } from "../../src/providers/slideshare.js";

describe("SlideShareProvider", () => {
  const provider = new SlideShareProvider();

  describe("match", () => {
    it("matches a standard SlideShare URL", () => {
      expect(provider.match("https://www.slideshare.net/haaborern/the-seo-guide-for-2025")).toBe(
        true,
      );
    });

    it("matches a SlideShare URL without www", () => {
      expect(provider.match("https://slideshare.net/user/presentation-title")).toBe(true);
    });

    it("matches an http URL", () => {
      expect(provider.match("http://slideshare.net/user/presentation")).toBe(true);
    });

    it("does not match the SlideShare homepage", () => {
      expect(provider.match("https://www.slideshare.net/")).toBe(false);
    });

    it("does not match a user profile page", () => {
      expect(provider.match("https://www.slideshare.net/haaborern")).toBe(false);
    });

    it("does not match unrelated URLs", () => {
      expect(provider.match("https://example.com/slideshare.net/user/pres")).toBe(false);
    });
  });

  describe("resolve", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              type: "rich",
              html: '<iframe src="https://www.slideshare.net/slideshow/embed_code/key/abc123" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe>',
              title: "REST API Design Best Practices",
              author_name: "johndoe",
              author_url: "https://www.slideshare.net/johndoe",
              thumbnail_url: "https://cdn.slidesharecdn.com/ss_thumbnails/rest-api-thumb.jpg",
              width: 595,
              height: 485,
            }),
        }),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("resolves a SlideShare presentation URL", async () => {
      const result = await provider.resolve(
        "https://www.slideshare.net/johndoe/rest-api-design-best-practices",
      );

      expect(result.provider).toBe("slideshare");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("slideshare.net/slideshow/embed_code");
      expect(result.title).toBe("REST API Design Best Practices");
      expect(result.author_name).toBe("johndoe");
      expect(result.thumbnail_url).toContain("slidesharecdn.com");
      expect(result.url).toBe("https://www.slideshare.net/johndoe/rest-api-design-best-practices");
    });

    it("passes maxWidth/maxHeight to the API", async () => {
      await provider.resolve("https://www.slideshare.net/johndoe/rest-api-design-best-practices", {
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

      await expect(provider.resolve("https://www.slideshare.net/user/nonexistent")).rejects.toThrow(
        "slideshare oEmbed request failed: 404 Not Found",
      );
    });
  });
});
