import { afterEach, describe, expect, it, vi } from "vitest";
import type { KVNamespaceLike } from "../../src/adapters/cloudflare-kv.js";
import { CloudflareKVCacheAdapter } from "../../src/adapters/cloudflare-kv.js";
import type { CacheAdapter } from "../../src/cache.js";
import type { EmbedResult } from "../../src/types.js";

function fakeResult(overrides?: Partial<EmbedResult>): EmbedResult {
  return {
    type: "video",
    html: "<iframe></iframe>",
    provider: "test",
    url: "https://example.com/video/1",
    ...overrides,
  };
}

function createMockKV(): KVNamespaceLike & {
  _store: Map<string, { value: string; expirationTtl?: number }>;
} {
  const store = new Map<string, { value: string; expirationTtl?: number }>();
  return {
    _store: store,
    async get(key: string, _type: "text") {
      const entry = store.get(key);
      return entry ? entry.value : null;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      store.set(key, { value, expirationTtl: options?.expirationTtl });
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
      const keys: { name: string }[] = [];
      for (const k of store.keys()) {
        if (!options?.prefix || k.startsWith(options.prefix)) {
          keys.push({ name: k });
        }
      }
      return { keys, list_complete: true as const, cursor: undefined };
    },
  };
}

describe("CloudflareKVCacheAdapter", () => {
  it("implements CacheAdapter interface", () => {
    const kv = createMockKV();
    const cache: CacheAdapter = new CloudflareKVCacheAdapter({
      namespace: kv,
    });
    expect(cache.get).toBeDefined();
    expect(cache.set).toBeDefined();
    expect(cache.delete).toBeDefined();
    expect(cache.clear).toBeDefined();
  });

  it("stores and retrieves values", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });
    const result = fakeResult();

    await cache.set("key1", result);
    const cached = await cache.get("key1");
    expect(cached).toEqual(result);
  });

  it("returns undefined on cache miss", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });

    const cached = await cache.get("nonexistent");
    expect(cached).toBeUndefined();
  });

  it("uses default key prefix 'framer:'", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });

    await cache.set("key1", fakeResult());
    expect(kv._store.has("framer:key1")).toBe(true);
  });

  it("accepts custom key prefix", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({
      namespace: kv,
      keyPrefix: "embed:",
    });

    await cache.set("key1", fakeResult());
    expect(kv._store.has("embed:key1")).toBe(true);
    expect(kv._store.has("framer:key1")).toBe(false);
  });

  it("uses default TTL of 300 seconds", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });

    await cache.set("key1", fakeResult());
    const entry = kv._store.get("framer:key1");
    expect(entry?.expirationTtl).toBe(300);
  });

  it("accepts custom default TTL", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({
      namespace: kv,
      defaultTtl: 600,
    });

    await cache.set("key1", fakeResult());
    const entry = kv._store.get("framer:key1");
    expect(entry?.expirationTtl).toBe(600);
  });

  it("accepts per-call TTL override", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });

    await cache.set("key1", fakeResult(), 120);
    const entry = kv._store.get("framer:key1");
    expect(entry?.expirationTtl).toBe(120);
  });

  it("serializes EmbedResult as JSON", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });
    const result = fakeResult({ title: "Test Video", width: 640 });

    await cache.set("key1", result);
    const raw = kv._store.get("framer:key1");
    expect(raw?.value).toBe(JSON.stringify(result));
  });

  it("deserializes JSON back to EmbedResult", async () => {
    const kv = createMockKV();
    const cache = new CloudflareKVCacheAdapter({ namespace: kv });
    const result = fakeResult({
      title: "Test Video",
      width: 640,
      height: 360,
      thumbnail_url: "https://example.com/thumb.jpg",
    });

    await cache.set("key1", result);
    const cached = await cache.get("key1");
    expect(cached).toEqual(result);
    expect(cached?.title).toBe("Test Video");
    expect(cached?.width).toBe(640);
  });

  describe("delete", () => {
    it("returns true when entry existed", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({ namespace: kv });

      await cache.set("key1", fakeResult());
      const deleted = await cache.delete("key1");
      expect(deleted).toBe(true);
    });

    it("returns false when entry did not exist", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({ namespace: kv });

      const deleted = await cache.delete("nonexistent");
      expect(deleted).toBe(false);
    });

    it("removes the entry from KV", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({ namespace: kv });

      await cache.set("key1", fakeResult());
      await cache.delete("key1");
      const cached = await cache.get("key1");
      expect(cached).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("removes all entries with the key prefix", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({ namespace: kv });

      await cache.set("key1", fakeResult());
      await cache.set("key2", fakeResult());
      await cache.set("key3", fakeResult());

      await cache.clear();

      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
      expect(await cache.get("key3")).toBeUndefined();
    });

    it("does not remove entries with a different prefix", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({
        namespace: kv,
        keyPrefix: "app1:",
      });

      // Add entries with our prefix
      await cache.set("key1", fakeResult());

      // Add entry with a different prefix directly
      await kv.put("other:key1", JSON.stringify(fakeResult()));

      await cache.clear();

      // Our entry should be gone
      expect(await cache.get("key1")).toBeUndefined();
      // Other entry should remain
      expect(kv._store.has("other:key1")).toBe(true);
    });

    it("handles paginated list results", async () => {
      const kv = createMockKV();
      let callCount = 0;

      // Override list to simulate pagination
      kv.list = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            keys: [{ name: "framer:key1" }, { name: "framer:key2" }],
            list_complete: false,
            cursor: "cursor1",
          };
        }
        return {
          keys: [{ name: "framer:key3" }],
          list_complete: true,
          cursor: undefined,
        };
      };

      // Pre-populate store
      await kv.put("framer:key1", "{}");
      await kv.put("framer:key2", "{}");
      await kv.put("framer:key3", "{}");

      const cache = new CloudflareKVCacheAdapter({ namespace: kv });
      await cache.clear();

      expect(callCount).toBe(2);
      expect(kv._store.has("framer:key1")).toBe(false);
      expect(kv._store.has("framer:key2")).toBe(false);
      expect(kv._store.has("framer:key3")).toBe(false);
    });
  });

  describe("integration with resolve()", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("works as a CacheAdapter with resolve()", async () => {
      const kv = createMockKV();
      const cache = new CloudflareKVCacheAdapter({ namespace: kv });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe>yt</iframe>" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { resolve } = await import("../../src/resolver.js");

      const result1 = await resolve("https://www.youtube.com/watch?v=abc", {
        cache,
      });
      const result2 = await resolve("https://www.youtube.com/watch?v=abc", {
        cache,
      });

      expect(result1.html).toBe(result2.html);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
