import { describe, expect, it } from "vitest";
import type { EmbedResult } from "../../src/types.js";
import { enhanceAccessibility } from "../../src/utils/accessibility.js";

function makeResult(overrides: Partial<EmbedResult> = {}): EmbedResult {
  return {
    type: "video",
    html: '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe>',
    provider: "youtube",
    title: "Test Video",
    url: "https://www.youtube.com/watch?v=abc",
    ...overrides,
  };
}

describe("enhanceAccessibility", () => {
  describe("default behavior", () => {
    it("adds title, aria-label, and tabindex to iframe", () => {
      const result = makeResult();
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('title="Test Video"');
      expect(html).toContain('aria-label="youtube: Test Video"');
      expect(html).toContain('tabindex="0"');
    });

    it("adds aria-label and tabindex to blockquote", () => {
      const result = makeResult({
        html: '<blockquote class="twitter-tweet"><p>Hello</p></blockquote>',
      });
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('aria-label="youtube: Test Video"');
      expect(html).toContain('tabindex="0"');
    });

    it("does not overwrite existing title attribute", () => {
      const result = makeResult({
        html: '<iframe src="https://example.com" title="Existing Title"></iframe>',
      });
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('title="Existing Title"');
      expect(html).not.toContain('title="Test Video"');
    });

    it("does not overwrite existing aria-label", () => {
      const result = makeResult({
        html: '<iframe src="https://example.com" aria-label="Custom Label"></iframe>',
      });
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('aria-label="Custom Label"');
      expect(html).not.toContain('aria-label="youtube: Test Video"');
    });

    it("does not overwrite existing tabindex", () => {
      const result = makeResult({
        html: '<iframe src="https://example.com" tabindex="-1"></iframe>',
      });
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('tabindex="-1"');
      expect(html).not.toContain('tabindex="0"');
    });

    it("uses provider name only when title is missing", () => {
      const result = makeResult({ title: undefined });
      const html = enhanceAccessibility(result.html, result);
      expect(html).toContain('aria-label="youtube"');
      expect(html).not.toContain("title=");
    });
  });

  describe("disabled", () => {
    it("returns html unchanged when options is false", () => {
      const result = makeResult();
      const html = enhanceAccessibility(result.html, result, false);
      expect(html).toBe(result.html);
    });
  });

  describe("custom options", () => {
    it("uses custom ariaLabel", () => {
      const result = makeResult();
      const html = enhanceAccessibility(result.html, result, {
        ariaLabel: "My custom label",
      });
      expect(html).toContain('aria-label="My custom label"');
    });

    it("uses custom tabIndex", () => {
      const result = makeResult();
      const html = enhanceAccessibility(result.html, result, { tabIndex: -1 });
      expect(html).toContain('tabindex="-1"');
    });

    it("adds custom role", () => {
      const result = makeResult();
      const html = enhanceAccessibility(result.html, result, { role: "document" });
      expect(html).toContain('role="document"');
    });
  });

  describe("HTML escaping", () => {
    it("escapes special characters in title", () => {
      const result = makeResult({ title: 'Video <script>"alert"</script>' });
      const html = enhanceAccessibility(result.html, result);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("multiple elements", () => {
    it("enhances all iframe and blockquote elements", () => {
      const result = makeResult({
        html:
          '<iframe src="https://a.com"></iframe>' +
          '<blockquote class="tweet"><p>Text</p></blockquote>',
      });
      const html = enhanceAccessibility(result.html, result);
      const ariaCount = (html.match(/aria-label=/g) || []).length;
      expect(ariaCount).toBe(2);
    });
  });
});
