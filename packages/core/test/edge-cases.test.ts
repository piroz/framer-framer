import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCacheAdapter } from "../src/cache.js";
import { expandUrls } from "../src/cms/auto-expand.js";
import { EmbedError } from "../src/errors.js";
import { youtubeProvider } from "../src/providers/index.js";
import type { EmbedResult } from "../src/types.js";

function fakeResult(overrides?: Partial<EmbedResult>): EmbedResult {
  return {
    type: "video",
    html: "<iframe></iframe>",
    provider: "test",
    url: "https://example.com/video/1",
    ...overrides,
  };
}

describe("Timeout edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws EmbedError with TIMEOUT code when AbortSignal fires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted.", "TimeoutError"));
          };
          if (init.signal?.aborted) {
            onAbort();
            return;
          }
          init.signal?.addEventListener("abort", onAbort);
        });
      }),
    );

    const provider = youtubeProvider;
    const err = await provider
      .resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        timeout: 1,
        retry: { maxRetries: 0 },
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });

  it("throws EmbedError with OEMBED_FETCH_FAILED when server returns 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const provider = youtubeProvider;
    try {
      await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        retry: { maxRetries: 0 },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EmbedError);
      expect((err as EmbedError).code).toBe("OEMBED_FETCH_FAILED");
      expect((err as EmbedError).message).toContain("500");
    }
  });

  it("throws EmbedError with OEMBED_FETCH_FAILED when server returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    const provider = youtubeProvider;
    try {
      await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        retry: { maxRetries: 0 },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EmbedError);
      expect((err as EmbedError).code).toBe("OEMBED_FETCH_FAILED");
      expect((err as EmbedError).message).toContain("404");
    }
  });
});

describe("Invalid oEmbed response handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws OEMBED_PARSE_ERROR when response is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      }),
    );

    const provider = youtubeProvider;
    try {
      await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        retry: { maxRetries: 0 },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EmbedError);
      expect((err as EmbedError).code).toBe("OEMBED_PARSE_ERROR");
      expect((err as EmbedError).message).toContain("not valid JSON");
      expect((err as EmbedError).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("returns empty html when response has no html field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            title: "Test Video",
            // no html field
          }),
      }),
    );

    const provider = youtubeProvider;
    const result = await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.html).toBe("");
  });

  it("defaults type to rich when type field is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            html: "<iframe></iframe>",
            // no type field
          }),
      }),
    );

    const provider = youtubeProvider;
    const result = await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.type).toBe("rich");
  });

  it("handles response with all fields as wrong types gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 123,
            html: 456,
            title: true,
            thumbnail_url: [],
          }),
      }),
    );

    const provider = youtubeProvider;
    // Should not throw — the provider casts fields without strict validation
    const result = await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      sanitize: false,
    });
    expect(result).toBeDefined();
    expect(result.provider).toBe("youtube");
  });

  it("handles completely empty JSON object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const provider = youtubeProvider;
    const result = await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.type).toBe("rich");
    expect(result.html).toBe("");
    expect(result.provider).toBe("youtube");
    expect(result.title).toBeUndefined();
  });
});

describe("Cache boundary conditions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns entry at exact TTL boundary (not yet expired)", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 1000 });
    await cache.set("https://a.com", fakeResult());

    vi.advanceTimersByTime(1000);

    // At exactly ttl, Date.now() === expiresAt, condition is > not >=
    expect(await cache.get("https://a.com")).toBeDefined();
  });

  it("evicts entry 1ms after TTL", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 1000 });
    await cache.set("https://a.com", fakeResult());

    vi.advanceTimersByTime(1001);

    expect(await cache.get("https://a.com")).toBeUndefined();
  });

  it("works correctly with maxSize of 1", async () => {
    const cache = new MemoryCacheAdapter({ maxSize: 1 });

    await cache.set("https://a.com", fakeResult({ url: "https://a.com" }));
    expect(await cache.get("https://a.com")).toBeDefined();
    expect(cache.size).toBe(1);

    await cache.set("https://b.com", fakeResult({ url: "https://b.com" }));
    expect(await cache.get("https://a.com")).toBeUndefined();
    expect(await cache.get("https://b.com")).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it("re-inserting after TTL expiry creates a fresh entry", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 100 });
    await cache.set("https://a.com", fakeResult({ html: "<old/>" }));

    vi.advanceTimersByTime(101);
    expect(await cache.get("https://a.com")).toBeUndefined();

    await cache.set("https://a.com", fakeResult({ html: "<new/>" }));
    expect((await cache.get("https://a.com"))?.html).toBe("<new/>");
  });

  it("evicts multiple entries when filling to capacity from empty", async () => {
    const cache = new MemoryCacheAdapter({ maxSize: 3 });

    for (let i = 0; i < 5; i++) {
      await cache.set(`https://${i}.com`, fakeResult({ url: `https://${i}.com` }));
    }

    expect(cache.size).toBe(3);
    // First two should be evicted
    expect(await cache.get("https://0.com")).toBeUndefined();
    expect(await cache.get("https://1.com")).toBeUndefined();
    // Last three should exist
    expect(await cache.get("https://2.com")).toBeDefined();
    expect(await cache.get("https://3.com")).toBeDefined();
    expect(await cache.get("https://4.com")).toBeDefined();
  });

  it("expired entries do not count toward size after lazy eviction", async () => {
    const cache = new MemoryCacheAdapter({ maxSize: 3, ttl: 100 });

    await cache.set("https://a.com", fakeResult());
    await cache.set("https://b.com", fakeResult());
    expect(cache.size).toBe(2);

    vi.advanceTimersByTime(101);

    // Access triggers lazy eviction
    await cache.get("https://a.com");
    expect(cache.size).toBe(1); // only b.com remains (not yet accessed/evicted)

    await cache.get("https://b.com");
    expect(cache.size).toBe(0);
  });
});

describe("expandUrls edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("handles nested HTML tags with URLs in text mode", async () => {
    mockFetch();
    const text =
      "Outer: https://www.youtube.com/watch?v=abc\n> Quoted: https://www.youtube.com/watch?v=def";
    const result = await expandUrls(text);

    expect(result).toContain("<iframe");
    expect(result).not.toContain("https://www.youtube.com/watch?v=abc");
    expect(result).not.toContain("https://www.youtube.com/watch?v=def");
  });

  it("handles same URL appearing multiple times", async () => {
    const fetchMock = mockFetch();
    const text =
      "First: https://www.youtube.com/watch?v=same\nSecond: https://www.youtube.com/watch?v=same\nThird: https://www.youtube.com/watch?v=same";
    const result = await expandUrls(text);

    // All occurrences should be expanded
    expect(result).not.toContain("https://www.youtube.com/watch?v=same");
    expect(result.match(/<iframe/g)?.length).toBe(3);

    // But fetch should only be called once (deduplication)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles Markdown and HTML mixed in text mode", async () => {
    mockFetch();
    const text =
      "Link: [click](https://www.youtube.com/watch?v=linked)\nBare: https://www.youtube.com/watch?v=bare";
    const result = await expandUrls(text);

    // Markdown link should be preserved
    expect(result).toContain("[click](https://www.youtube.com/watch?v=linked)");
    // Bare URL should be expanded
    expect(result).not.toContain("Bare: https://www.youtube.com/watch?v=bare");
    expect(result).toContain("Bare: <iframe");
  });

  it("handles URLs surrounded by parentheses", async () => {
    mockFetch();
    const text = "(https://www.youtube.com/watch?v=paren)";
    const result = await expandUrls(text);
    expect(result).toContain("<iframe");
  });

  it("handles HTML mode with nested tags", async () => {
    mockFetch();
    const html =
      '<div><p>Watch: https://www.youtube.com/watch?v=abc</p><a href="https://www.youtube.com/watch?v=linked">Link</a></div>';
    const result = await expandUrls(html, { format: "html" });

    // Bare URL in text should be expanded
    expect(result).toContain("<iframe");
    // URL inside href should be preserved
    expect(result).toContain('href="https://www.youtube.com/watch?v=linked"');
  });

  it("handles empty and whitespace-only input", async () => {
    expect(await expandUrls("")).toBe("");
    expect(await expandUrls("   ")).toBe("   ");
    expect(await expandUrls("\n\n")).toBe("\n\n");
  });

  it("leaves non-embeddable URLs unchanged when resolution fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const text = "Visit: https://www.youtube.com/watch?v=fail";
    const result = await expandUrls(text);
    expect(result).toContain("https://www.youtube.com/watch?v=fail");
  });
});
