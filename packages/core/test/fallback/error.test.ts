import { describe, expect, it } from "vitest";
import { buildErrorFallback } from "../../src/fallback/error.js";

describe("Error Fallback", () => {
  it("generates fallback HTML with provider branding", () => {
    const result = buildErrorFallback({
      url: "https://www.youtube.com/watch?v=test",
      provider: "youtube",
      brandColor: "#FF0000",
    });

    expect(result.type).toBe("link");
    expect(result.provider).toBe("youtube");
    expect(result.url).toBe("https://www.youtube.com/watch?v=test");
    expect(result.html).toContain("framer-framer-error");
    expect(result.html).toContain("#FF0000");
    expect(result.html).toContain("Y"); // initial
    expect(result.html).toContain("Youtube"); // capitalized name
    expect(result.html).toContain("https://www.youtube.com/watch?v=test");
  });

  it("uses default color when brandColor is not provided", () => {
    const result = buildErrorFallback({
      url: "https://example.com",
      provider: "custom",
    });

    expect(result.html).toContain("#6B7280");
    expect(result.html).toContain("C"); // initial
    expect(result.html).toContain("Custom");
  });

  it("escapes HTML in URL and provider name", () => {
    const result = buildErrorFallback({
      url: 'https://example.com/?q=<script>alert("xss")</script>',
      provider: '<img onerror="alert(1)">',
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain('onerror="');
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("onerror=&quot;");
  });

  it("renders a clickable link to the original URL", () => {
    const result = buildErrorFallback({
      url: "https://vimeo.com/12345",
      provider: "vimeo",
      brandColor: "#1AB7EA",
    });

    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noopener"');
    expect(result.html).toContain('href="https://vimeo.com/12345"');
  });
});
