import { describe, expect, it } from "vitest";
import { IframeProvider } from "../../src/providers/iframe-base.js";

/** Minimal concrete subclass for testing the base class */
class TestProvider extends IframeProvider {
  name = "test";
  protected patterns = [/^https:\/\/test\.example\.com\/.+/];

  protected buildEmbedUrl(url: string): string | null {
    try {
      return `${new URL(url).origin}/embed${new URL(url).pathname}`;
    } catch {
      return null;
    }
  }
}

class CustomSandboxProvider extends IframeProvider {
  name = "custom";
  protected patterns = [/^https:\/\/custom\.example\.com\/.+/];
  protected override sandboxFlags = ["allow-scripts"];
  protected override referrerPolicy = "strict-origin";

  protected buildEmbedUrl(url: string): string | null {
    return url;
  }
}

/** Subclass that returns dangerous characters in title */
class XssTitleProvider extends IframeProvider {
  name = "xss";
  protected patterns = [/^https:\/\/xss\.example\.com\/.+/];

  protected buildEmbedUrl(url: string): string | null {
    return url;
  }

  protected override extractTitle(): string {
    return '<script>alert("xss")</script>';
  }
}

describe("IframeProvider (base class)", () => {
  const provider = new TestProvider();

  describe("sandbox defaults", () => {
    it("includes allow-forms, allow-popups, allow-same-origin, allow-scripts", async () => {
      const result = await provider.resolve("https://test.example.com/foo");

      expect(result.html).toContain(
        'sandbox="allow-forms allow-popups allow-same-origin allow-scripts"',
      );
    });

    it("does not include allow-modals", async () => {
      const result = await provider.resolve("https://test.example.com/foo");

      expect(result.html).not.toContain("allow-modals");
    });
  });

  describe("referrerpolicy", () => {
    it('defaults to "no-referrer"', async () => {
      const result = await provider.resolve("https://test.example.com/foo");

      expect(result.html).toContain('referrerpolicy="no-referrer"');
    });
  });

  describe("sandbox override", () => {
    const custom = new CustomSandboxProvider();

    it("uses overridden sandbox flags", async () => {
      const result = await custom.resolve("https://custom.example.com/bar");

      expect(result.html).toContain('sandbox="allow-scripts"');
      expect(result.html).not.toContain("allow-forms");
      expect(result.html).not.toContain("allow-popups");
      expect(result.html).not.toContain("allow-same-origin");
    });

    it("uses overridden referrer policy", async () => {
      const result = await custom.resolve("https://custom.example.com/bar");

      expect(result.html).toContain('referrerpolicy="strict-origin"');
    });
  });

  describe("HTML escaping", () => {
    const xss = new XssTitleProvider();

    it("escapes dangerous characters in title", async () => {
      const result = await xss.resolve("https://xss.example.com/foo");

      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
      expect(result.html).toContain("&quot;");
    });

    it("does not produce unquoted attribute values", async () => {
      const result = await xss.resolve("https://xss.example.com/foo");

      // title attribute must be properly quoted and escaped
      expect(result.html).toMatch(/title="[^"]*"/);
    });
  });
});
