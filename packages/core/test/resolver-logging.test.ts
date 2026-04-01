import { afterEach, describe, expect, it, vi } from "vitest";
import { resolve } from "../src/resolver.js";
import type { Logger } from "../src/utils/logger.js";

function createMockLogger(): Logger & {
  calls: { level: string; entry: Record<string, unknown> }[];
} {
  const calls: { level: string; entry: Record<string, unknown> }[] = [];
  return {
    calls,
    debug: vi.fn((entry) => calls.push({ level: "debug", entry })),
    info: vi.fn((entry) => calls.push({ level: "info", entry })),
    warn: vi.fn((entry) => calls.push({ level: "warn", entry })),
    error: vi.fn((entry) => calls.push({ level: "error", entry })),
  };
}

describe("resolve - structured logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs successful resolution with provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe src="https://www.youtube.com/embed/test"></iframe>',
            title: "Test",
            provider_name: "YouTube",
          }),
      }),
    );

    const logger = createMockLogger();
    await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { logger });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const entry = logger.calls[0].entry;
    expect(entry.message).toBe("embed resolved");
    expect(entry.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(entry.provider).toBe("youtube");
    expect(entry.status).toBe("provider");
    expect(entry.latencyMs).toBeTypeOf("number");
    expect(entry.timestamp).toBeTypeOf("string");
  });

  it("logs cache hit", async () => {
    const { MemoryCacheAdapter } = await import("../src/cache.js");
    const cache = new MemoryCacheAdapter();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: "<iframe></iframe>",
            title: "Test",
            provider_name: "YouTube",
          }),
      }),
    );

    // First call to populate cache
    await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { cache });

    const logger = createMockLogger();
    // Second call should hit cache
    await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      cache,
      logger,
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const entry = logger.calls[0].entry;
    expect(entry.status).toBe("cache_hit");
    expect(entry.provider).toBe("youtube");
  });

  it("logs error on resolution failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const logger = createMockLogger();
    await expect(
      resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        logger,
        retry: { maxRetries: 0 },
      }),
    ).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const entry = logger.calls[0].entry;
    expect(entry.message).toBe("embed failed");
    expect(entry.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(entry.provider).toBe("youtube");
    expect(entry.latencyMs).toBeTypeOf("number");
  });

  it("logs discovery resolution", async () => {
    const discoveryHtml = `
      <html><head>
        <link rel="alternate" type="application/json+oembed"
              href="https://unknown-site.com/oembed?url=https://unknown-site.com/post/1&format=json" />
      </head><body></body></html>
    `;

    const oembedResponse = {
      type: "rich",
      html: '<iframe src="https://unknown-site.com/embed/1"></iframe>',
      provider_name: "UnknownSite",
      title: "A Post",
    };

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(discoveryHtml),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(oembedResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const logger = createMockLogger();
    await resolve("https://unknown-site.com/post/1", { logger });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const entry = logger.calls[0].entry;
    expect(entry.status).toBe("discovery");
    expect(entry.provider).toBe("UnknownSite");
  });

  it("logs OGP fallback resolution", async () => {
    const plainHtml = `
      <html><head>
        <meta property="og:title" content="OGP Title" />
        <meta property="og:site_name" content="PlainSite" />
      </head><body></body></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(plainHtml),
      }),
    );

    const logger = createMockLogger();
    await resolve("https://plain-site.com/page", { logger });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const entry = logger.calls[0].entry;
    expect(entry.status).toBe("ogp_fallback");
    expect(entry.provider).toBe("PlainSite");
  });

  it("does not log when logger is not provided", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: "<iframe></iframe>",
            provider_name: "YouTube",
          }),
      }),
    );

    await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs with built-in logger when logger is true", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: "<iframe></iframe>",
            provider_name: "YouTube",
          }),
      }),
    );

    await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      logger: true,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.message).toBe("embed resolved");
    expect(output.level).toBe("info");

    spy.mockRestore();
  });
});
