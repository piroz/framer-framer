import { describe, expect, it } from "vitest";
import { NiconicoProvider } from "../../src/providers/niconico.js";

describe("NiconicoProvider", () => {
  const provider = new NiconicoProvider();

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

  describe("resolve", () => {
    it("resolves a nicovideo.jp URL", async () => {
      const result = await provider.resolve("https://www.nicovideo.jp/watch/sm9");

      expect(result.provider).toBe("niconico");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("https://embed.nicovideo.jp/watch/sm9");
      expect(result.html).toContain("sandbox=");
      expect(result.title).toBe("Niconico sm9");
      expect(result.url).toBe("https://www.nicovideo.jp/watch/sm9");
    });

    it("resolves a nico.ms short URL", async () => {
      const result = await provider.resolve("https://nico.ms/sm12345678");

      expect(result.html).toContain("https://embed.nicovideo.jp/watch/sm12345678");
      expect(result.title).toBe("Niconico sm12345678");
    });

    it("resolves a live.nicovideo.jp URL", async () => {
      const result = await provider.resolve("https://live.nicovideo.jp/watch/lv123456789");

      expect(result.html).toContain("https://embed.nicovideo.jp/watch/lv123456789");
      expect(result.title).toBe("Niconico lv123456789");
    });

    it("has correct sandbox attributes", async () => {
      const result = await provider.resolve("https://www.nicovideo.jp/watch/sm9");

      expect(result.html).toContain(
        'sandbox="allow-forms allow-popups allow-same-origin allow-scripts"',
      );
    });

    it('includes referrerpolicy="no-referrer"', async () => {
      const result = await provider.resolve("https://www.nicovideo.jp/watch/sm9");

      expect(result.html).toContain('referrerpolicy="no-referrer"');
    });

    it("respects maxWidth and maxHeight", async () => {
      const result = await provider.resolve("https://www.nicovideo.jp/watch/sm9", {
        maxWidth: 800,
        maxHeight: 450,
      });

      expect(result.html).toContain('width="800"');
      expect(result.html).toContain('height="450"');
      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });
  });
});
