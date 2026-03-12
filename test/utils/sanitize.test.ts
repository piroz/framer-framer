import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../../src/utils/sanitize.js";

describe("sanitizeHtml", () => {
  describe("allowed tags", () => {
    it("preserves iframe tags with allowed attributes", () => {
      const html =
        '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315" frameborder="0" allowfullscreen></iframe>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves blockquote tags", () => {
      const html = '<blockquote class="twitter-tweet"><p>Hello world</p></blockquote>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves a tags with allowed attributes", () => {
      const html =
        '<a href="https://example.com" title="Example" target="_blank" rel="noopener">Link</a>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves div, span, p tags", () => {
      const html =
        '<div class="embed"><span class="highlight"><p class="text">Content</p></span></div>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves br, strong, em tags", () => {
      const html = "<p><strong>Bold</strong> and <em>italic</em><br>New line</p>";
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("removes style attributes", () => {
      const html = '<div style="background:url(evil)">Content</div>';
      expect(sanitizeHtml(html)).toBe("<div>Content</div>");
    });
  });

  describe("disallowed tags", () => {
    it("removes style tags and their content", () => {
      const html = "<style>body { color: red; }</style><p>Content</p>";
      expect(sanitizeHtml(html)).toBe("<p>Content</p>");
    });

    it("removes img tags", () => {
      const html = '<img src="https://example.com/img.jpg" alt="photo"><p>Text</p>';
      expect(sanitizeHtml(html)).toBe("<p>Text</p>");
    });

    it("removes form tags but preserves text", () => {
      const html = "<form><p>Content</p></form>";
      expect(sanitizeHtml(html)).toBe("<p>Content</p>");
    });

    it("removes input tags", () => {
      const html = '<p>Text</p><input type="text" value="evil">';
      expect(sanitizeHtml(html)).toBe("<p>Text</p>");
    });

    it("removes object and embed tags", () => {
      const html = '<object data="evil.swf"></object><embed src="evil.swf">';
      expect(sanitizeHtml(html)).toBe("");
    });
  });

  describe("attribute filtering", () => {
    it("removes disallowed attributes from allowed tags", () => {
      const html = '<div class="ok" id="bad" data-custom="bad">Content</div>';
      expect(sanitizeHtml(html)).toBe('<div class="ok">Content</div>');
    });

    it("removes event handler attributes", () => {
      const html = '<div onclick="alert(1)" onmouseover="evil()" class="ok">Content</div>';
      expect(sanitizeHtml(html)).toBe('<div class="ok">Content</div>');
    });

    it("escapes double quotes in attribute values to prevent injection", () => {
      // Single-quoted attribute containing double quotes — without escaping
      // this would become: class="foo" onclick="alert(1)" (attribute injection)
      const html = "<div class='foo\" onclick=\"alert(1)'>Content</div>";
      expect(sanitizeHtml(html)).toBe(
        '<div class="foo&quot; onclick=&quot;alert(1)">Content</div>',
      );
    });
  });

  describe("javascript: URL prevention", () => {
    it("removes javascript: href from a tags", () => {
      const html = '<a href="javascript:alert(1)">Click me</a>';
      expect(sanitizeHtml(html)).toBe("<a>Click me</a>");
    });

    it("removes javascript: src from iframe tags", () => {
      const html = '<iframe src="javascript:alert(1)"></iframe>';
      expect(sanitizeHtml(html)).toBe("<iframe></iframe>");
    });

    it("removes data: URLs", () => {
      const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>';
      expect(sanitizeHtml(html)).toBe("<a>Click</a>");
    });

    it("removes vbscript: URLs", () => {
      const html = '<a href="vbscript:MsgBox(1)">Click</a>';
      expect(sanitizeHtml(html)).toBe("<a>Click</a>");
    });

    it("handles case-insensitive javascript: URLs", () => {
      const html = '<a href="JaVaScRiPt:alert(1)">Click</a>';
      expect(sanitizeHtml(html)).toBe("<a>Click</a>");
    });
  });

  describe("script tag handling", () => {
    it("allows script tags from platform.twitter.com", () => {
      const html =
        '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("allows script tags from cdn.embedly.com", () => {
      const html = '<script src="https://cdn.embedly.com/widgets/platform.js"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("allows script tags from www.tiktok.com", () => {
      const html = '<script async src="https://www.tiktok.com/embed.js"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("allows script tags from www.instagram.com", () => {
      const html = '<script async src="https://www.instagram.com/embed.js"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("allows script tags from connect.facebook.net", () => {
      const html = '<script src="https://connect.facebook.net/en_US/sdk.js"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("removes script tags from disallowed domains", () => {
      const html = '<script src="https://evil.com/steal.js"></script>';
      expect(sanitizeHtml(html)).toBe("");
    });

    it("removes inline script tags (no src)", () => {
      const html = "<script>alert('xss')</script>";
      expect(sanitizeHtml(html)).toBe("");
    });

    it("removes script tag content for disallowed scripts", () => {
      const html = "<script>document.cookie</script><p>Safe</p>";
      expect(sanitizeHtml(html)).toBe("<p>Safe</p>");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("handles plain text without tags", () => {
      expect(sanitizeHtml("Hello world")).toBe("Hello world");
    });

    it("handles nested allowed tags", () => {
      const html = '<div class="outer"><div class="inner"><p>Text</p></div></div>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves text content of removed tags", () => {
      const html = "<h1>Title</h1><p>Paragraph</p>";
      expect(sanitizeHtml(html)).toBe("Title<p>Paragraph</p>");
    });
  });

  describe("real-world oEmbed HTML", () => {
    it("handles Twitter oEmbed HTML", () => {
      const html =
        '<blockquote class="twitter-tweet"><p>Tweet content</p>' +
        '<a href="https://twitter.com/user/status/123">link</a></blockquote>' +
        '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("handles YouTube oEmbed HTML", () => {
      const html =
        '<iframe width="200" height="113" src="https://www.youtube.com/embed/abc123" ' +
        'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        'allowfullscreen title="Video Title"></iframe>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("strips malicious additions to otherwise valid HTML", () => {
      const html =
        '<blockquote class="twitter-tweet"><p>Tweet</p></blockquote>' +
        '<script>document.location="https://evil.com"</script>' +
        '<script async src="https://platform.twitter.com/widgets.js"></script>';
      const expected =
        '<blockquote class="twitter-tweet"><p>Tweet</p></blockquote>' +
        '<script async src="https://platform.twitter.com/widgets.js"></script>';
      expect(sanitizeHtml(html)).toBe(expected);
    });
  });
});
