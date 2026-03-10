import { describe, expect, it } from "vitest";
import { HuggingFaceProvider } from "../../src/providers/huggingface.js";

describe("HuggingFaceProvider", () => {
  const provider = new HuggingFaceProvider();

  describe("match", () => {
    it.each([
      "https://huggingface.co/spaces/stabilityai/stable-diffusion",
      "https://huggingface.co/spaces/openai/whisper",
      "https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard",
      "https://huggingface.co/spaces/gradio/chatbot",
      "https://huggingface.co/spaces/user-name/my.app/settings",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://huggingface.co/models/bert-base",
      "https://huggingface.co/datasets/squad",
      "https://huggingface.co/spaces/",
      "https://example.com/spaces/foo/bar",
      "huggingface.co/spaces/user/app",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("resolve", () => {
    it("resolves a Hugging Face Spaces URL", async () => {
      const result = await provider.resolve(
        "https://huggingface.co/spaces/stabilityai/stable-diffusion",
      );

      expect(result.provider).toBe("huggingface");
      expect(result.type).toBe("rich");
      expect(result.html).toContain("<iframe");
      expect(result.html).toContain("huggingface.co/spaces/stabilityai/stable-diffusion/embed");
      expect(result.html).toContain("sandbox=");
      expect(result.title).toBe("stabilityai/stable-diffusion - Hugging Face Space");
      expect(result.url).toBe("https://huggingface.co/spaces/stabilityai/stable-diffusion");
    });

    it("ignores sub-paths and builds embed URL from owner/name only", async () => {
      const result = await provider.resolve("https://huggingface.co/spaces/user/app/some/subpath");

      expect(result.html).toContain("huggingface.co/spaces/user/app/embed");
    });

    it("respects maxWidth and maxHeight", async () => {
      const result = await provider.resolve("https://huggingface.co/spaces/gradio/chatbot", {
        maxWidth: 600,
        maxHeight: 400,
      });

      expect(result.html).toContain('width="600"');
      expect(result.html).toContain('height="400"');
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
    });
  });
});
