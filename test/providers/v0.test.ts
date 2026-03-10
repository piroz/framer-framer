import { describe, expect, it } from "vitest";
import { V0Provider } from "../../src/providers/v0.js";

describe("V0Provider", () => {
  const provider = new V0Provider();

  describe("match", () => {
    it.each([
      "https://v0.dev/t/abc123",
      "https://v0.dev/t/some-long-id-here",
      "https://v0.dev/chat/abc123",
      "https://v0.dev/chat/my-session-id",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://v0.dev/",
      "https://v0.dev/t/",
      "https://example.com/t/abc123",
      "https://v0.dev/docs",
      "v0.dev/t/abc123",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("resolve", () => {
    it("resolves a /t/ URL with .embed suffix", async () => {
      const result = await provider.resolve("https://v0.dev/t/abc123");

      expect(result.provider).toBe("v0");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("v0.dev/t/abc123.embed");
      expect(result.title).toBe("v0.dev — abc123");
      expect(result.url).toBe("https://v0.dev/t/abc123");
    });

    it("resolves a /chat/ URL", async () => {
      const result = await provider.resolve("https://v0.dev/chat/my-session");

      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("v0.dev/chat/my-session");
      expect(result.title).toBe("v0.dev — my-session");
    });

    it("does not add .embed suffix to /chat/ URLs", async () => {
      const result = await provider.resolve("https://v0.dev/chat/my-session");

      expect(result.html).not.toContain(".embed");
    });

    it("respects maxWidth and maxHeight", async () => {
      const result = await provider.resolve("https://v0.dev/t/abc123", {
        maxWidth: 1024,
        maxHeight: 768,
      });

      expect(result.html).toContain('width="1024"');
      expect(result.html).toContain('height="768"');
    });
  });
});
