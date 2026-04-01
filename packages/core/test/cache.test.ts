import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheAdapter } from "../src/cache.js";
import { buildKey, MemoryCacheAdapter } from "../src/cache.js";
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

describe("MemoryCacheAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("implements CacheAdapter interface", () => {
    const cache: CacheAdapter = new MemoryCacheAdapter();
    expect(cache.get).toBeDefined();
    expect(cache.set).toBeDefined();
    expect(cache.delete).toBeDefined();
    expect(cache.clear).toBeDefined();
  });

  it("stores and retrieves results", async () => {
    const cache = new MemoryCacheAdapter();
    const result = fakeResult();
    await cache.set("https://example.com", result);
    expect(await cache.get("https://example.com")).toEqual(result);
  });

  it("returns undefined on cache miss", async () => {
    const cache = new MemoryCacheAdapter();
    expect(await cache.get("https://example.com")).toBeUndefined();
  });

  it("differentiates by cache key (sanitize option)", async () => {
    const cache = new MemoryCacheAdapter();
    const r1 = fakeResult({ html: "<iframe>sanitized</iframe>" });
    const r2 = fakeResult({ html: "<iframe>raw</iframe>" });

    const key1 = buildKey("https://example.com");
    const key2 = buildKey("https://example.com", { sanitize: false });

    await cache.set(key1, r1);
    await cache.set(key2, r2);

    expect((await cache.get(key1))?.html).toBe("<iframe>sanitized</iframe>");
    expect((await cache.get(key2))?.html).toBe("<iframe>raw</iframe>");
  });

  it("differentiates by cache key (maxWidth/maxHeight)", async () => {
    const cache = new MemoryCacheAdapter();
    const r1 = fakeResult({ html: "<iframe w=400>" });
    const r2 = fakeResult({ html: "<iframe w=800>" });

    const key1 = buildKey("https://example.com", { maxWidth: 400 });
    const key2 = buildKey("https://example.com", { maxWidth: 800 });

    await cache.set(key1, r1);
    await cache.set(key2, r2);

    expect((await cache.get(key1))?.html).toBe("<iframe w=400>");
    expect((await cache.get(key2))?.html).toBe("<iframe w=800>");
  });

  it("evicts expired entries on get", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 1000 });
    await cache.set("https://example.com", fakeResult());

    vi.advanceTimersByTime(1001);

    expect(await cache.get("https://example.com")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("returns entry before TTL expires", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 1000 });
    await cache.set("https://example.com", fakeResult());

    vi.advanceTimersByTime(999);

    expect(await cache.get("https://example.com")).toBeDefined();
  });

  it("supports per-entry TTL override", async () => {
    const cache = new MemoryCacheAdapter({ ttl: 10_000 });
    await cache.set("https://example.com", fakeResult(), 500);

    vi.advanceTimersByTime(501);

    expect(await cache.get("https://example.com")).toBeUndefined();
  });

  it("evicts LRU entry when maxSize is reached", async () => {
    const cache = new MemoryCacheAdapter({ maxSize: 2 });
    await cache.set("https://a.com", fakeResult({ url: "https://a.com" }));
    await cache.set("https://b.com", fakeResult({ url: "https://b.com" }));
    await cache.set("https://c.com", fakeResult({ url: "https://c.com" }));

    expect(await cache.get("https://a.com")).toBeUndefined();
    expect(await cache.get("https://b.com")).toBeDefined();
    expect(await cache.get("https://c.com")).toBeDefined();
    expect(cache.size).toBe(2);
  });

  it("promotes accessed entries (LRU ordering)", async () => {
    const cache = new MemoryCacheAdapter({ maxSize: 2 });
    await cache.set("https://a.com", fakeResult({ url: "https://a.com" }));
    await cache.set("https://b.com", fakeResult({ url: "https://b.com" }));

    // Access a.com to promote it
    await cache.get("https://a.com");

    // Adding c.com should now evict b.com (LRU), not a.com
    await cache.set("https://c.com", fakeResult({ url: "https://c.com" }));

    expect(await cache.get("https://a.com")).toBeDefined();
    expect(await cache.get("https://b.com")).toBeUndefined();
    expect(await cache.get("https://c.com")).toBeDefined();
  });

  it("clear() removes all entries", async () => {
    const cache = new MemoryCacheAdapter();
    await cache.set("https://a.com", fakeResult());
    await cache.set("https://b.com", fakeResult());
    expect(cache.size).toBe(2);

    await cache.clear();

    expect(cache.size).toBe(0);
    expect(await cache.get("https://a.com")).toBeUndefined();
  });

  it("size returns current entry count", async () => {
    const cache = new MemoryCacheAdapter();
    expect(cache.size).toBe(0);

    await cache.set("https://a.com", fakeResult());
    expect(cache.size).toBe(1);

    await cache.set("https://b.com", fakeResult());
    expect(cache.size).toBe(2);
  });

  it("delete() removes a specific entry and returns true", async () => {
    const cache = new MemoryCacheAdapter();
    await cache.set("https://a.com", fakeResult());
    await cache.set("https://b.com", fakeResult());

    expect(await cache.delete("https://a.com")).toBe(true);
    expect(await cache.get("https://a.com")).toBeUndefined();
    expect(await cache.get("https://b.com")).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it("delete() returns false when entry does not exist", async () => {
    const cache = new MemoryCacheAdapter();
    expect(await cache.delete("https://nonexistent.com")).toBe(false);
  });

  it("overwrites existing entry for same key", async () => {
    const cache = new MemoryCacheAdapter();
    await cache.set("https://a.com", fakeResult({ html: "<old/>" }));
    await cache.set("https://a.com", fakeResult({ html: "<new/>" }));

    expect(cache.size).toBe(1);
    expect((await cache.get("https://a.com"))?.html).toBe("<new/>");
  });
});

describe("buildKey", () => {
  it("returns URL when no options", () => {
    expect(buildKey("https://example.com")).toBe("https://example.com");
  });

  it("includes maxWidth in key", () => {
    expect(buildKey("https://example.com", { maxWidth: 400 })).toBe("https://example.com|w=400");
  });

  it("includes maxHeight in key", () => {
    expect(buildKey("https://example.com", { maxHeight: 300 })).toBe("https://example.com|h=300");
  });

  it("includes sanitize=false in key", () => {
    expect(buildKey("https://example.com", { sanitize: false })).toBe("https://example.com|s=0");
  });

  it("combines multiple options", () => {
    expect(
      buildKey("https://example.com", { maxWidth: 400, maxHeight: 300, sanitize: false }),
    ).toBe("https://example.com|w=400|h=300|s=0");
  });
});

describe("custom CacheAdapter", () => {
  it("works with resolve() when implementing CacheAdapter", async () => {
    const store = new Map<string, EmbedResult>();
    const customAdapter: CacheAdapter = {
      async get(key) {
        return store.get(key);
      },
      async set(key, value) {
        store.set(key, value);
      },
      async delete(key) {
        return store.delete(key);
      },
      async clear() {
        store.clear();
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "video", html: "<iframe>yt</iframe>" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resolve } = await import("../src/resolver.js");

    const result1 = await resolve("https://www.youtube.com/watch?v=abc", { cache: customAdapter });
    const result2 = await resolve("https://www.youtube.com/watch?v=abc", { cache: customAdapter });

    expect(result1.html).toBe(result2.html);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(1);

    vi.restoreAllMocks();
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

    const cache = new MemoryCacheAdapter();
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

    const cache = new MemoryCacheAdapter();
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

    const cache = new MemoryCacheAdapter();
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

    const cache = new MemoryCacheAdapter();
    const { resolve } = await import("../src/resolver.js");

    const r1 = await resolve("https://www.youtube.com/watch?v=abc", { cache, maxWidth: 400 });
    const r2 = await resolve("https://www.youtube.com/watch?v=abc", { cache, maxWidth: 800 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r1.html).not.toBe(r2.html);
  });
});
