import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flickrProvider } from "../../src/providers/index.js";

describe("FlickrProvider", () => {
  const provider = flickrProvider;

  describe("match", () => {
    it.each([
      "https://www.flickr.com/photos/username/12345678901",
      "https://flickr.com/photos/username/12345678901",
      "https://www.flickr.com/photos/12345678@N00/52345678901",
      "https://flic.kr/p/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.flickr.com/people/username",
      "https://www.flickr.com/groups/group-name",
      "https://www.flickr.com/photos/",
      "https://example.com/photos/user/123",
      "https://flic.kr/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
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
              type: "photo",
              html: '<a data-flickr-embed="true" href="https://www.flickr.com/photos/username/12345678901"><img src="https://live.staticflickr.com/65535/12345678901_abc123_b.jpg" width="1024" height="768" alt="Sample Photo"></a><script async src="https://embedr.flickr.com/assets/client-code.js" charset="utf-8"></script>',
              title: "Sample Photo",
              author_name: "photographer",
              author_url: "https://www.flickr.com/photos/username/",
              thumbnail_url: "https://live.staticflickr.com/65535/12345678901_abc123_q.jpg",
              thumbnail_width: 150,
              thumbnail_height: 150,
              width: 1024,
              height: 768,
            }),
        }),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("resolves a Flickr photo URL", async () => {
      const result = await provider.resolve("https://www.flickr.com/photos/username/12345678901");

      expect(result.provider).toBe("flickr");
      expect(result.type).toBe("photo");
      expect(result.html).toContain("flickr.com/photos");
      expect(result.title).toBe("Sample Photo");
      expect(result.author_name).toBe("photographer");
      expect(result.thumbnail_url).toContain("staticflickr.com");
      expect(result.url).toBe("https://www.flickr.com/photos/username/12345678901");
    });

    it("passes maxWidth/maxHeight to the API", async () => {
      await provider.resolve("https://www.flickr.com/photos/username/12345678901", {
        maxWidth: 640,
        maxHeight: 480,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("maxwidth=640");
      expect(fetchCall).toContain("maxheight=480");
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
        provider.resolve("https://www.flickr.com/photos/username/99999999999"),
      ).rejects.toThrow("flickr oEmbed request failed: 404 Not Found");
    });

    it("resolves a short flic.kr URL", async () => {
      const result = await provider.resolve("https://flic.kr/p/abc123");

      expect(result.provider).toBe("flickr");
      expect(result.type).toBe("photo");

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("url=https%3A%2F%2Fflic.kr%2Fp%2Fabc123");
    });
  });
});
