import { afterEach, describe, expect, it, vi } from "vitest";
import { expandUrls } from "../../src/cms/auto-expand.js";

function mockFetch() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "video",
          html: `<iframe src="${url}"></iframe>`,
          provider_name: "YouTube",
          title: "Test Video",
        }),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("expandUrls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty string unchanged", async () => {
    const result = await expandUrls("");
    expect(result).toBe("");
  });

  it("returns text without URLs unchanged", async () => {
    const text = "Hello, this is plain text without any links.";
    const result = await expandUrls(text);
    expect(result).toBe(text);
  });

  it("expands a standalone URL in text", async () => {
    mockFetch();
    const text = "Check this: https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const result = await expandUrls(text);
    expect(result).toContain("<iframe");
    expect(result).toContain("Check this: ");
    expect(result).not.toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("expands multiple URLs", async () => {
    mockFetch();
    const text =
      "Video 1: https://www.youtube.com/watch?v=abc\nVideo 2: https://www.youtube.com/watch?v=def";
    const result = await expandUrls(text);
    expect(result).toContain("Video 1: <iframe");
    expect(result).toContain("Video 2: <iframe");
  });

  it("preserves Markdown link syntax", async () => {
    mockFetch();
    const text =
      "Click [here](https://www.youtube.com/watch?v=abc) or visit https://www.youtube.com/watch?v=def";
    const result = await expandUrls(text);
    // Markdown link should be preserved
    expect(result).toContain("[here](https://www.youtube.com/watch?v=abc)");
    // Standalone URL should be expanded
    expect(result).not.toContain("visit https://www.youtube.com/watch?v=def");
    expect(result).toContain("visit <iframe");
  });

  it("preserves Markdown image syntax", async () => {
    mockFetch();
    const text = "![alt](https://example.com/image.png) and https://www.youtube.com/watch?v=abc";
    const result = await expandUrls(text);
    expect(result).toContain("![alt](https://example.com/image.png)");
  });

  it("leaves URL unchanged on resolution failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = "Watch: https://www.youtube.com/watch?v=invalid";
    const result = await expandUrls(text);
    expect(result).toContain("https://www.youtube.com/watch?v=invalid");
  });

  it("respects exclude option with string prefix", async () => {
    mockFetch();
    const text = "https://www.youtube.com/watch?v=abc and https://example.com/page";
    const result = await expandUrls(text, {
      exclude: ["https://example.com"],
    });
    // YouTube should be expanded
    expect(result).toContain("<iframe");
    // example.com should be preserved
    expect(result).toContain("https://example.com/page");
  });

  it("respects exclude option with RegExp", async () => {
    mockFetch();
    const text = "https://www.youtube.com/watch?v=abc and https://vimeo.com/123";
    const result = await expandUrls(text, {
      exclude: [/vimeo\.com/],
    });
    expect(result).not.toContain("https://www.youtube.com/watch?v=abc");
    expect(result).toContain("https://vimeo.com/123");
  });

  it("respects concurrency option", async () => {
    let activeCalls = 0;
    let maxActiveCalls = 0;

    const fetchMock = vi.fn().mockImplementation(() => {
      activeCalls++;
      if (activeCalls > maxActiveCalls) maxActiveCalls = activeCalls;
      return new Promise((resolve) => {
        setTimeout(() => {
          activeCalls--;
          resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                type: "video",
                html: "<iframe></iframe>",
                provider_name: "YouTube",
                title: "Test",
              }),
          });
        }, 10);
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 6 }, (_, i) => `https://www.youtube.com/watch?v=video${i}`);
    const text = urls.join("\n");

    await expandUrls(text, { concurrency: 2 });
    expect(maxActiveCalls).toBeLessThanOrEqual(2);
  });

  it("deduplicates URLs — resolves same URL only once", async () => {
    const fetchMock = mockFetch();
    const text =
      "First: https://www.youtube.com/watch?v=abc\nSecond: https://www.youtube.com/watch?v=abc";
    const result = await expandUrls(text);
    // Both occurrences should be expanded
    expect(result).toContain("First: <iframe");
    expect(result).toContain("Second: <iframe");
    // fetch should be called only once for the same URL (oEmbed endpoint)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("strips trailing punctuation from URLs", async () => {
    mockFetch();
    const text = "Visit https://www.youtube.com/watch?v=abc.";
    const result = await expandUrls(text);
    expect(result).toContain("<iframe");
    expect(result).toContain(".");
  });

  describe("HTML mode", () => {
    it("expands bare URLs in HTML text content", async () => {
      mockFetch();
      const html = "<p>Watch https://www.youtube.com/watch?v=abc here</p>";
      const result = await expandUrls(html, { format: "html" });
      expect(result).toContain("<iframe");
      expect(result).not.toContain("https://www.youtube.com/watch?v=abc");
    });

    it("preserves URLs inside href attributes", async () => {
      mockFetch();
      const html =
        '<p><a href="https://www.youtube.com/watch?v=abc">Link</a> and https://www.youtube.com/watch?v=def</p>';
      const result = await expandUrls(html, { format: "html" });
      // URL in href should be preserved
      expect(result).toContain('href="https://www.youtube.com/watch?v=abc"');
      // Bare URL should be expanded
      expect(result).not.toContain("and https://www.youtube.com/watch?v=def");
      expect(result).toContain("and <iframe");
    });

    it("preserves URLs inside src attributes", async () => {
      mockFetch();
      const html =
        '<iframe src="https://www.youtube.com/embed/abc"></iframe> https://www.youtube.com/watch?v=def';
      const result = await expandUrls(html, { format: "html" });
      expect(result).toContain('src="https://www.youtube.com/embed/abc"');
    });
  });

  it("passes embed options to resolve", async () => {
    const fetchMock = mockFetch();
    const text = "https://www.youtube.com/watch?v=abc";
    await expandUrls(text, { maxWidth: 640, maxHeight: 480 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("maxwidth=640");
    expect(calledUrl).toContain("maxheight=480");
  });
});
