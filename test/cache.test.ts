import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCache, EmbedCache } from "../src/cache.js";
import { clearHooks, onBeforeResolve } from "../src/resolver.js";
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

describe("EmbedCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves results", () => {
    const cache = new EmbedCache();
    const result = fakeResult();
    cache.set("https://example.com", undefined, result);
    expect(cache.get("https://example.com")).toEqual(result);
  });

  it("returns undefined on cache miss", () => {
    const cache = new EmbedCache();
    expect(cache.get("https://example.com")).toBeUndefined();
  });

  it("differentiates by sanitize option", () => {
    const cache = new EmbedCache();
    const r1 = fakeResult({ html: "<iframe>sanitized</iframe>" });
    const r2 = fakeResult({ html: "<iframe>raw</iframe>" });

    cache.set("https://example.com", undefined, r1);
    cache.set("https://example.com", { sanitize: false }, r2);

    expect(cache.get("https://example.com")?.html).toBe("<iframe>sanitized</iframe>");
    expect(cache.get("https://example.com", { sanitize: false })?.html).toBe(
      "<iframe>raw</iframe>",
    );
  });

  it("differentiates by options (maxWidth/maxHeight)", () => {
    const cache = new EmbedCache();
    const r1 = fakeResult({ html: "<iframe w=400>" });
    const r2 = fakeResult({ html: "<iframe w=800>" });

    cache.set("https://example.com", { maxWidth: 400 }, r1);
    cache.set("https://example.com", { maxWidth: 800 }, r2);

    expect(cache.get("https://example.com", { maxWidth: 400 })?.html).toBe("<iframe w=400>");
    expect(cache.get("https://example.com", { maxWidth: 800 })?.html).toBe("<iframe w=800>");
  });

  it("evicts expired entries on get", () => {
    const cache = new EmbedCache({ ttl: 1000 });
    cache.set("https://example.com", undefined, fakeResult());

    vi.advanceTimersByTime(1001);

    expect(cache.get("https://example.com")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("returns entry before TTL expires", () => {
    const cache = new EmbedCache({ ttl: 1000 });
    cache.set("https://example.com", undefined, fakeResult());

    vi.advanceTimersByTime(999);

    expect(cache.get("https://example.com")).toBeDefined();
  });

  it("evicts LRU entry when maxSize is reached", () => {
    const cache = new EmbedCache({ maxSize: 2 });
    cache.set("https://a.com", undefined, fakeResult({ url: "https://a.com" }));
    cache.set("https://b.com", undefined, fakeResult({ url: "https://b.com" }));
    cache.set("https://c.com", undefined, fakeResult({ url: "https://c.com" }));

    expect(cache.get("https://a.com")).toBeUndefined();
    expect(cache.get("https://b.com")).toBeDefined();
    expect(cache.get("https://c.com")).toBeDefined();
    expect(cache.size).toBe(2);
  });

  it("promotes accessed entries (LRU ordering)", () => {
    const cache = new EmbedCache({ maxSize: 2 });
    cache.set("https://a.com", undefined, fakeResult({ url: "https://a.com" }));
    cache.set("https://b.com", undefined, fakeResult({ url: "https://b.com" }));

    // Access a.com to promote it
    cache.get("https://a.com");

    // Adding c.com should now evict b.com (LRU), not a.com
    cache.set("https://c.com", undefined, fakeResult({ url: "https://c.com" }));

    expect(cache.get("https://a.com")).toBeDefined();
    expect(cache.get("https://b.com")).toBeUndefined();
    expect(cache.get("https://c.com")).toBeDefined();
  });

  it("clear() removes all entries", () => {
    const cache = new EmbedCache();
    cache.set("https://a.com", undefined, fakeResult());
    cache.set("https://b.com", undefined, fakeResult());
    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get("https://a.com")).toBeUndefined();
  });

  it("size returns current entry count", () => {
    const cache = new EmbedCache();
    expect(cache.size).toBe(0);

    cache.set("https://a.com", undefined, fakeResult());
    expect(cache.size).toBe(1);

    cache.set("https://b.com", undefined, fakeResult());
    expect(cache.size).toBe(2);
  });

  it("delete() removes a specific entry and returns true", () => {
    const cache = new EmbedCache();
    cache.set("https://a.com", undefined, fakeResult());
    cache.set("https://b.com", undefined, fakeResult());

    expect(cache.delete("https://a.com")).toBe(true);
    expect(cache.get("https://a.com")).toBeUndefined();
    expect(cache.get("https://b.com")).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it("delete() returns false when entry does not exist", () => {
    const cache = new EmbedCache();
    expect(cache.delete("https://nonexistent.com")).toBe(false);
  });

  it("delete() respects options in cache key", () => {
    const cache = new EmbedCache();
    cache.set("https://a.com", { maxWidth: 400 }, fakeResult({ html: "<w400>" }));
    cache.set("https://a.com", { maxWidth: 800 }, fakeResult({ html: "<w800>" }));

    // Delete only the maxWidth=400 variant
    expect(cache.delete("https://a.com", { maxWidth: 400 })).toBe(true);
    expect(cache.get("https://a.com", { maxWidth: 400 })).toBeUndefined();
    expect(cache.get("https://a.com", { maxWidth: 800 })).toBeDefined();
  });

  it("overwrites existing entry for same key", () => {
    const cache = new EmbedCache();
    cache.set("https://a.com", undefined, fakeResult({ html: "<old/>" }));
    cache.set("https://a.com", undefined, fakeResult({ html: "<new/>" }));

    expect(cache.size).toBe(1);
    expect(cache.get("https://a.com")?.html).toBe("<new/>");
  });
});

describe("createCache", () => {
  it("returns an EmbedCache instance", () => {
    const cache = createCache();
    expect(cache).toBeInstanceOf(EmbedCache);
  });

  it("accepts custom options", () => {
    const cache = createCache({ maxSize: 50, ttl: 10_000 });
    expect(cache).toBeInstanceOf(EmbedCache);
  });
});

describe("cache integration with resolve()", () => {
  afterEach(() => {
    clearHooks();
    vi.restoreAllMocks();
  });

  it("caches results and returns them on subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "video", html: "<iframe>yt</iframe>" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const cache = createCache();
    const { resolve } = await import("../src/resolver.js");

    const result1 = await resolve("https://www.youtube.com/watch?v=abc", { cache });
    const result2 = await resolve("https://www.youtube.com/watch?v=abc", { cache });

    expect(result1.html).toBe(result2.html);
    // fetch should only be called once — second call served from cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache when cache option is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "video", html: "<iframe></iframe>" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resolve } = await import("../src/resolver.js");

    await resolve("https://www.youtube.com/watch?v=abc", { cache: false });
    await resolve("https://www.youtube.com/watch?v=abc", { cache: false });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache when cache option is omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "video", html: "<iframe></iframe>" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resolve } = await import("../src/resolver.js");

    await resolve("https://www.youtube.com/watch?v=abc");
    await resolve("https://www.youtube.com/watch?v=abc");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches results from before-hook short-circuits", async () => {
    const shortCircuitResult = fakeResult({ html: "<div>from-hook</div>" });
    onBeforeResolve(() => shortCircuitResult);

    vi.stubGlobal("fetch", vi.fn());

    const cache = createCache();
    const { resolve } = await import("../src/resolver.js");

    await resolve("https://www.youtube.com/watch?v=abc", { cache });

    // Remove the hook — second call should still hit cache
    clearHooks();
    const result = await resolve("https://www.youtube.com/watch?v=abc", { cache });

    expect(result.html).toBe("<div>from-hook</div>");
  });

  it("does not cache when resolution throws", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe>ok</iframe>" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const cache = createCache();
    const { resolve } = await import("../src/resolver.js");

    await expect(resolve("https://www.youtube.com/watch?v=abc", { cache })).rejects.toThrow();
    const result = await resolve("https://www.youtube.com/watch?v=abc", { cache });

    expect(result.html).toContain("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses separate cache entries for different options", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          type: "video",
          html: `<iframe src="https://example.com/${callCount}"></iframe>`,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const cache = createCache();
    const { resolve } = await import("../src/resolver.js");

    const r1 = await resolve("https://www.youtube.com/watch?v=abc", { cache, maxWidth: 400 });
    const r2 = await resolve("https://www.youtube.com/watch?v=abc", { cache, maxWidth: 800 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r1.html).not.toBe(r2.html);
  });
});
