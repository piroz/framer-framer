import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverOEmbedUrl, resolveWithDiscovery } from "../src/discovery.js";

const htmlWithOembedLink = `
<!DOCTYPE html>
<html>
<head>
  <title>Example Post</title>
  <link rel="alternate" type="application/json+oembed" href="https://example.com/oembed?url=https://example.com/post/123&format=json" />
</head>
<body></body>
</html>
`;

const htmlWithReversedAttributes = `
<!DOCTYPE html>
<html>
<head>
  <link href="https://example.com/oembed?url=https://example.com/post/456" type="application/json+oembed" rel="alternate" />
</head>
<body></body>
</html>
`;

const htmlWithXmlOnlyLink = `
<!DOCTYPE html>
<html>
<head>
  <link rel="alternate" type="text/xml+oembed" href="https://example.com/oembed?format=xml" />
</head>
<body></body>
</html>
`;

const htmlWithNoOembedLink = `
<!DOCTYPE html>
<html>
<head>
  <title>Plain Page</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body></body>
</html>
`;

const sampleOembedResponse = {
  type: "rich",
  html: '<iframe src="https://example.com/embed/123"></iframe>',
  provider_name: "ExamplePlatform",
  title: "Example Post Title",
  author_name: "John Doe",
  author_url: "https://example.com/johndoe",
  thumbnail_url: "https://example.com/thumb.jpg",
  width: 640,
  height: 480,
};

describe("discoverOEmbedUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts oEmbed URL from link tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlWithOembedLink),
      }),
    );

    const url = await discoverOEmbedUrl("https://example.com/post/123");
    expect(url).toBe("https://example.com/oembed?url=https://example.com/post/123&format=json");
  });

  it("extracts oEmbed URL when href comes before type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlWithReversedAttributes),
      }),
    );

    const url = await discoverOEmbedUrl("https://example.com/post/456");
    expect(url).toBe("https://example.com/oembed?url=https://example.com/post/456");
  });

  it("returns undefined for XML-only oEmbed link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlWithXmlOnlyLink),
      }),
    );

    const url = await discoverOEmbedUrl("https://example.com/xml-only");
    expect(url).toBeUndefined();
  });

  it("returns undefined when no oEmbed link is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlWithNoOembedLink),
      }),
    );

    const url = await discoverOEmbedUrl("https://example.com/plain");
    expect(url).toBeUndefined();
  });

  it("throws on failed fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(discoverOEmbedUrl("https://example.com/404")).rejects.toThrow(
      "Discovery: failed to fetch",
    );
  });
});

describe("resolveWithDiscovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves oEmbed via discovery", async () => {
    const fetchMock = vi.fn();
    // First call: fetch HTML page
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    // Second call: fetch oEmbed endpoint
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(sampleOembedResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveWithDiscovery("https://example.com/post/123");

    expect(result).toBeDefined();
    expect(result?.type).toBe("rich");
    expect(result?.html).toContain("iframe");
    expect(result?.provider).toBe("ExamplePlatform");
    expect(result?.title).toBe("Example Post Title");
    expect(result?.author_name).toBe("John Doe");
    expect(result?.width).toBe(640);
    expect(result?.url).toBe("https://example.com/post/123");
    expect(result?.raw).toEqual(sampleOembedResponse);
  });

  it("returns undefined when no oEmbed link is found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlWithNoOembedLink),
      }),
    );

    const result = await resolveWithDiscovery("https://example.com/plain");
    expect(result).toBeUndefined();
  });

  it("uses hostname as provider when provider_name is missing", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "video",
          html: "<iframe></iframe>",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveWithDiscovery("https://example.com/post/123");
    expect(result).toBeDefined();
    expect(result?.provider).toBe("example.com");
  });

  it("throws on oEmbed fetch failure", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveWithDiscovery("https://example.com/post/123", { retry: { maxRetries: 0 } }),
    ).rejects.toThrow("Discovery oEmbed request failed");
  });

  it("throws on invalid JSON oEmbed response", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveWithDiscovery("https://example.com/post/123")).rejects.toThrow(
      "Discovery oEmbed response is not valid JSON",
    );
  });

  it("sanitizes HTML by default", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "rich",
          html: '<div>safe</div><script>alert("xss")</script>',
          provider_name: "Test",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveWithDiscovery("https://example.com/post/123");
    expect(result?.html).not.toContain("<script>");
  });

  it("skips sanitization when sanitize is false", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlWithOembedLink),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "rich",
          html: '<div>safe</div><script>alert("xss")</script>',
          provider_name: "Test",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveWithDiscovery("https://example.com/post/123", {
      sanitize: false,
    });
    expect(result?.html).toContain("<script>");
  });
});
