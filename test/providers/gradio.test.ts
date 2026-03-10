import { describe, expect, it } from "vitest";
import { GradioProvider } from "../../src/providers/gradio.js";

describe("GradioProvider", () => {
  const provider = new GradioProvider();

  describe("match", () => {
    it.each([
      "https://stabilityai-stable-diffusion.hf.space",
      "https://stabilityai-stable-diffusion.hf.space/",
      "https://abc123-def456.gradio.live",
      "https://abc123-def456.gradio.live/",
      "https://00609f9247dec67ca3.gradio.live",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://huggingface.co/spaces/owner/name",
      "https://example.com",
      "https://hf.space",
      "https://gradio.live",
      "gradio.live/abc",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("resolve", () => {
    it("resolves a .hf.space URL", async () => {
      const result = await provider.resolve("https://stabilityai-stable-diffusion.hf.space");

      expect(result.provider).toBe("gradio");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("stabilityai-stable-diffusion.hf.space/");
      expect(result.title).toBe("stabilityai-stable-diffusion — Gradio App");
    });

    it("resolves a .gradio.live URL", async () => {
      const result = await provider.resolve("https://abc123-def456.gradio.live");

      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("abc123-def456.gradio.live/");
      expect(result.title).toBe("Gradio App (shared)");
    });

    it("has correct sandbox attributes", async () => {
      const result = await provider.resolve("https://stabilityai-stable-diffusion.hf.space");

      expect(result.html).toContain(
        'sandbox="allow-forms allow-popups allow-same-origin allow-scripts"',
      );
      expect(result.html).not.toContain("allow-modals");
    });

    it('includes referrerpolicy="no-referrer"', async () => {
      const result = await provider.resolve("https://stabilityai-stable-diffusion.hf.space");

      expect(result.html).toContain('referrerpolicy="no-referrer"');
    });

    it("respects maxWidth and maxHeight", async () => {
      const result = await provider.resolve("https://stabilityai-stable-diffusion.hf.space", {
        maxWidth: 640,
        maxHeight: 480,
      });

      expect(result.html).toContain('width="640"');
      expect(result.html).toContain('height="480"');
    });
  });
});
