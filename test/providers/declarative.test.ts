import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineProvider, defineProviders } from "../../src/providers/declarative.js";
import type { ProviderSchema } from "../../src/types.js";

describe("defineProvider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe src="https://example.com/embed/123"></iframe>',
            title: "Example Video",
            author_name: "Author",
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const schema: ProviderSchema = {
    name: "example",
    endpoint: "https://example.com/oembed",
    urlPatterns: [/^https?:\/\/example\.com\/video\//],
  };

  it("creates a provider from a schema", () => {
    const provider = defineProvider(schema);

    expect(provider.name).toBe("example");
    expect(provider.match("https://example.com/video/123")).toBe(true);
    expect(provider.match("https://other.com/video/123")).toBe(false);
  });

  it("resolves a URL via oEmbed", async () => {
    const provider = defineProvider(schema);
    const result = await provider.resolve("https://example.com/video/123");

    expect(result.provider).toBe("example");
    expect(result.type).toBe("video");
    expect(result.html).toContain("<iframe");
    expect(result.title).toBe("Example Video");
    expect(result.url).toBe("https://example.com/video/123");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    const provider = defineProvider(schema);
    await provider.resolve("https://example.com/video/123", {
      maxWidth: 640,
      maxHeight: 480,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=640");
    expect(fetchCall).toContain("maxheight=480");
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    const provider = defineProvider(schema);
    await expect(provider.resolve("https://example.com/video/123")).rejects.toThrow(
      "example oEmbed request failed: 404 Not Found",
    );
  });

  describe("string patterns (glob)", () => {
    it("converts glob pattern with * wildcard", () => {
      const provider = defineProvider({
        name: "glob-test",
        endpoint: "https://example.com/oembed",
        urlPatterns: ["https://example.com/video/*"],
      });

      expect(provider.match("https://example.com/video/123")).toBe(true);
      expect(provider.match("https://example.com/video/abc")).toBe(true);
      expect(provider.match("https://example.com/other/123")).toBe(false);
    });

    it("converts glob pattern with ** wildcard", () => {
      const provider = defineProvider({
        name: "glob-test",
        endpoint: "https://example.com/oembed",
        urlPatterns: ["https://example.com/**"],
      });

      expect(provider.match("https://example.com/video/123")).toBe(true);
      expect(provider.match("https://example.com/a/b/c")).toBe(true);
      expect(provider.match("https://other.com/video/123")).toBe(false);
    });

    it("handles mixed string and RegExp patterns", () => {
      const provider = defineProvider({
        name: "mixed",
        endpoint: "https://example.com/oembed",
        urlPatterns: ["https://example.com/video/*", /^https?:\/\/example\.com\/embed\//],
      });

      expect(provider.match("https://example.com/video/123")).toBe(true);
      expect(provider.match("https://example.com/embed/456")).toBe(true);
      expect(provider.match("https://example.com/other/789")).toBe(false);
    });
  });

  describe("transform option", () => {
    it("applies custom transform to oEmbed response", async () => {
      const provider = defineProvider({
        ...schema,
        options: {
          transform: (data, url) => ({
            type: "rich",
            html: `<div class="custom">${data.html}</div>`,
            provider: "example",
            title: `Custom: ${data.title}`,
            url,
          }),
        },
      });

      const result = await provider.resolve("https://example.com/video/123");

      expect(result.html).toContain('<div class="custom">');
      expect(result.title).toBe("Custom: Example Video");
      expect(result.type).toBe("rich");
    });
  });

  describe("metadata", () => {
    it("exposes metadata from schema", () => {
      const provider = defineProvider({
        ...schema,
        defaultAspectRatio: "16:9",
        embedType: "video",
        supportsMaxWidth: true,
      });

      const p = provider as {
        defaultAspectRatio?: string;
        embedType?: string;
        supportsMaxWidth?: boolean;
      };
      expect(p.defaultAspectRatio).toBe("16:9");
      expect(p.embedType).toBe("video");
      expect(p.supportsMaxWidth).toBe(true);
    });

    it("defaults supportsMaxWidth to true when not specified", () => {
      const provider = defineProvider(schema);
      const p = provider as { supportsMaxWidth?: boolean };
      expect(p.supportsMaxWidth).toBe(true);
    });
  });

  describe("validation", () => {
    it("throws if name is missing", () => {
      expect(() =>
        defineProvider({
          name: "",
          endpoint: "https://example.com/oembed",
          urlPatterns: [/test/],
        }),
      ).toThrow("'name' is required");
    });

    it("throws if endpoint is missing", () => {
      expect(() =>
        defineProvider({
          name: "test",
          endpoint: "",
          urlPatterns: [/test/],
        }),
      ).toThrow("'endpoint' is required");
    });

    it("throws if urlPatterns is empty", () => {
      expect(() =>
        defineProvider({
          name: "test",
          endpoint: "https://example.com/oembed",
          urlPatterns: [],
        }),
      ).toThrow("'urlPatterns' is required and must be a non-empty array");
    });
  });
});

describe("defineProviders", () => {
  it("creates multiple providers from schemas", () => {
    const providers = defineProviders([
      {
        name: "provider-a",
        endpoint: "https://a.com/oembed",
        urlPatterns: [/^https?:\/\/a\.com\//],
      },
      {
        name: "provider-b",
        endpoint: "https://b.com/oembed",
        urlPatterns: [/^https?:\/\/b\.com\//],
      },
    ]);

    expect(providers).toHaveLength(2);
    expect(providers[0].name).toBe("provider-a");
    expect(providers[1].name).toBe("provider-b");
    expect(providers[0].match("https://a.com/video")).toBe(true);
    expect(providers[1].match("https://b.com/video")).toBe(true);
  });
});
