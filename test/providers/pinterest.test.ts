import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PinterestProvider } from "../../src/providers/pinterest.js";

describe("PinterestProvider", () => {
  const provider = new PinterestProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<a data-pin-do="embedPin" href="https://www.pinterest.com/pin/123456789/"></a>',
            title: "Beautiful Interior Design",
            author_name: "Designer",
            author_url: "https://www.pinterest.com/designer/",
            width: 236,
            height: 600,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("match", () => {
    it.each([
      "https://www.pinterest.com/pin/123456789/",
      "https://pinterest.com/pin/123456789/",
      "https://www.pinterest.jp/pin/123456789/",
      "https://pinterest.jp/pin/123456789/",
      "http://www.pinterest.com/pin/123456789/",
    ])("matches pin URL: %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.pinterest.com/",
      "https://www.pinterest.com/user/",
      "https://www.example.com/pin/123456789/",
      "https://www.pinterest.fr/pin/123456789/",
      "https://www.pinterest.com/settings/profile/",
      "https://www.pinterest.com/_saved/pins/",
      "https://www.pinterest.com/user/my-board/",
      "https://pinterest.com/user/my-board",
      "https://www.pinterest.jp/user/my-board/",
      "https://pinterest.jp/user/my-board",
    ])("does not match: %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  it("resolves a Pinterest pin URL", async () => {
    const result = await provider.resolve("https://www.pinterest.com/pin/123456789/");

    expect(result.provider).toBe("pinterest");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("pinterest.com/pin");
    expect(result.title).toBe("Beautiful Interior Design");
    expect(result.author_name).toBe("Designer");
    expect(result.url).toBe("https://www.pinterest.com/pin/123456789/");
  });

  it("resolves a pinterest.jp URL by normalizing to .com for the API", async () => {
    const result = await provider.resolve("https://www.pinterest.jp/pin/123456789/");

    expect(result.provider).toBe("pinterest");
    expect(result.url).toBe("https://www.pinterest.jp/pin/123456789/");

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("url=https%3A%2F%2Fwww.pinterest.com%2Fpin%2F123456789%2F");
  });

  it("normalizes pinterest.jp without www prefix", async () => {
    await provider.resolve("https://pinterest.jp/pin/123456789/");

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("url=https%3A%2F%2Fpinterest.com%2Fpin%2F123456789%2F");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://www.pinterest.com/pin/123456789/", {
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

    await expect(provider.resolve("https://www.pinterest.com/pin/invalid")).rejects.toThrow(
      "pinterest oEmbed request failed: 404 Not Found",
    );
  });
});
