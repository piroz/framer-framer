import { describe, expect, it } from "vitest";
import { wrapResponsive } from "../../src/cms/responsive.js";

const sampleHtml = '<iframe src="https://example.com"></iframe>';

describe("wrapResponsive", () => {
  describe("inline mode (default)", () => {
    it("wraps HTML with aspect-ratio container when width and height are provided", () => {
      const result = wrapResponsive(sampleHtml, { width: 640, height: 360 });
      expect(result).toContain("padding-bottom:56.2500%");
      expect(result).toContain("position:relative");
      expect(result).toContain("width:100%");
      expect(result).toContain("height:0");
      expect(result).toContain(sampleHtml);
    });

    it("wraps HTML without aspect-ratio when dimensions are missing", () => {
      const result = wrapResponsive(sampleHtml);
      expect(result).not.toContain("padding-bottom");
      expect(result).toContain("width:100%");
      expect(result).toContain(sampleHtml);
    });

    it("wraps HTML without aspect-ratio when only width is provided", () => {
      const result = wrapResponsive(sampleHtml, { width: 640 });
      expect(result).not.toContain("padding-bottom");
      expect(result).toContain(sampleHtml);
    });

    it("wraps HTML without aspect-ratio when only height is provided", () => {
      const result = wrapResponsive(sampleHtml, { height: 360 });
      expect(result).not.toContain("padding-bottom");
      expect(result).toContain(sampleHtml);
    });

    it("wraps HTML without aspect-ratio when width is 0", () => {
      const result = wrapResponsive(sampleHtml, { width: 0, height: 360 });
      expect(result).not.toContain("padding-bottom");
    });

    it("wraps HTML without aspect-ratio when height is 0", () => {
      const result = wrapResponsive(sampleHtml, { width: 640, height: 0 });
      expect(result).not.toContain("padding-bottom");
    });

    it("calculates correct aspect ratio for 16:9", () => {
      const result = wrapResponsive(sampleHtml, { width: 1920, height: 1080 });
      expect(result).toContain("padding-bottom:56.2500%");
    });

    it("calculates correct aspect ratio for 4:3", () => {
      const result = wrapResponsive(sampleHtml, { width: 800, height: 600 });
      expect(result).toContain("padding-bottom:75.0000%");
    });

    it("calculates correct aspect ratio for 1:1", () => {
      const result = wrapResponsive(sampleHtml, { width: 500, height: 500 });
      expect(result).toContain("padding-bottom:100.0000%");
    });

    it("uses custom maxWidth", () => {
      const result = wrapResponsive(sampleHtml, { maxWidth: "640px" });
      expect(result).toContain("max-width:640px");
    });

    it("defaults maxWidth to 100%", () => {
      const result = wrapResponsive(sampleHtml);
      expect(result).toContain("max-width:100%");
    });

    it("escapes HTML special characters in maxWidth", () => {
      const result = wrapResponsive(sampleHtml, { maxWidth: '"><script>' });
      expect(result).not.toContain('"><script>');
      expect(result).toContain("&quot;&gt;&lt;script&gt;");
    });
  });

  describe("class mode", () => {
    it("wraps HTML with class names when aspect ratio is available", () => {
      const result = wrapResponsive(sampleHtml, {
        width: 640,
        height: 360,
        mode: "class",
      });
      expect(result).toContain('class="embed-responsive"');
      expect(result).toContain('class="embed-responsive__ratio"');
      expect(result).toContain('class="embed-responsive__inner"');
      expect(result).toContain("padding-bottom:56.2500%");
      expect(result).toContain(sampleHtml);
    });

    it("wraps HTML with class names without aspect ratio", () => {
      const result = wrapResponsive(sampleHtml, { mode: "class" });
      expect(result).toContain('class="embed-responsive"');
      expect(result).not.toContain("__ratio");
      expect(result).not.toContain("__inner");
      expect(result).toContain(sampleHtml);
    });

    it("uses custom className", () => {
      const result = wrapResponsive(sampleHtml, {
        width: 640,
        height: 360,
        mode: "class",
        className: "my-embed",
      });
      expect(result).toContain('class="my-embed"');
      expect(result).toContain('class="my-embed__ratio"');
      expect(result).toContain('class="my-embed__inner"');
    });

    it("escapes HTML special characters in className", () => {
      const result = wrapResponsive(sampleHtml, {
        mode: "class",
        className: '"><script>',
      });
      expect(result).not.toContain('"><script>');
      expect(result).toContain("&quot;&gt;&lt;script&gt;");
    });
  });

  describe("edge cases", () => {
    it("handles empty HTML string", () => {
      const result = wrapResponsive("");
      expect(result).toContain("<div");
      expect(result).toContain("</div>");
    });

    it("handles undefined options", () => {
      const result = wrapResponsive(sampleHtml);
      expect(result).toContain(sampleHtml);
    });

    it("handles negative width", () => {
      const result = wrapResponsive(sampleHtml, { width: -100, height: 200 });
      expect(result).not.toContain("padding-bottom");
    });

    it("handles negative height", () => {
      const result = wrapResponsive(sampleHtml, { width: 100, height: -200 });
      expect(result).not.toContain("padding-bottom");
    });
  });
});
