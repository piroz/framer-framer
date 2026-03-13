import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NiconicoProvider } from "../../src/providers/niconico.js";

describe("NiconicoProvider", () => {
  const provider = new NiconicoProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe src="https://embed.nicovideo.jp/watch/sm9" width="640" height="360" allowfullscreen></iframe>',
            title: "新・豪血寺一族 -煩悩解放-　レッツゴー！陰陽師",
            author_name: "ニコニコ動画",
            author_url: "https://www.nicovideo.jp/",
            thumbnail_url: "https://nicovideo.cdn.nimg.jp/thumbnails/9/9",
            thumbnail_width: 640,
            thumbnail_height: 360,
            width: 640,
            height: 360,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("match", () => {
    it("matches nicovideo.jp/watch URLs", () => {
      expect(provider.match("https://www.nicovideo.jp/watch/sm9")).toBe(true);
      expect(provider.match("https://nicovideo.jp/watch/sm12345678")).toBe(true);
    });

    it("matches nico.ms short URLs", () => {
      expect(provider.match("https://nico.ms/sm9")).toBe(true);
      expect(provider.match("https://nico.ms/sm12345678")).toBe(true);
    });

    it("matches live.nicovideo.jp URLs", () => {
      expect(provider.match("https://live.nicovideo.jp/watch/lv123456789")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(provider.match("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
      expect(provider.match("https://example.com")).toBe(false);
    });
  });

  it("resolves a Niconico video URL", async () => {
    const result = await provider.resolve("https://www.nicovideo.jp/watch/sm9");

    expect(result.provider).toBe("niconico");
    expect(result.type).toBe("video");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("embed.nicovideo.jp");
    expect(result.title).toBe("新・豪血寺一族 -煩悩解放-　レッツゴー！陰陽師");
    expect(result.author_name).toBe("ニコニコ動画");
    expect(result.thumbnail_url).toContain("nicovideo.cdn.nimg.jp");
    expect(result.url).toBe("https://www.nicovideo.jp/watch/sm9");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://www.nicovideo.jp/watch/sm9", {
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

    await expect(provider.resolve("https://www.nicovideo.jp/watch/sm999999999")).rejects.toThrow(
      "niconico oEmbed request failed: 404 Not Found",
    );
  });
});
