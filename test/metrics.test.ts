import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHooks, onBeforeResolve } from "../src/resolver.js";
import type { EmbedResult, MetricsEvent } from "../src/types.js";
import { clearMetrics, onMetrics } from "../src/utils/metrics.js";

function fakeResult(overrides?: Partial<EmbedResult>): EmbedResult {
  return {
    type: "video",
    html: "<iframe></iframe>",
    provider: "test",
    url: "https://example.com/video/1",
    ...overrides,
  };
}

describe("metrics", () => {
  afterEach(() => {
    clearMetrics();
    clearHooks();
    vi.restoreAllMocks();
  });

  it("emits metrics event on successful resolution", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await resolve("https://www.youtube.com/watch?v=abc123");

    expect(events).toHaveLength(1);
    expect(events[0].url).toBe("https://www.youtube.com/watch?v=abc123");
    expect(events[0].provider).toBe("youtube");
    expect(events[0].success).toBe(true);
    expect(events[0].cacheHit).toBe(false);
    expect(events[0].duration).toBeGreaterThanOrEqual(0);
    expect(events[0].errorCode).toBeUndefined();
  });

  it("emits metrics event on failed resolution", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await expect(resolve("https://www.youtube.com/watch?v=abc123")).rejects.toThrow();

    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(false);
    expect(events[0].errorCode).toBeDefined();
  });

  it("emits metrics with cacheHit=true for cached results", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      }),
    );

    const { createCache } = await import("../src/cache.js");
    const { resolve } = await import("../src/resolver.js");
    const cache = createCache();

    // First call: populates cache
    await resolve("https://www.youtube.com/watch?v=abc123", { cache });
    // Second call: should be a cache hit
    await resolve("https://www.youtube.com/watch?v=abc123", { cache });

    expect(events).toHaveLength(2);
    expect(events[0].cacheHit).toBe(false);
    expect(events[1].cacheHit).toBe(true);
    expect(events[1].duration).toBe(0);
  });

  it("emits metrics for before-hook short-circuited results", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));

    const cached = fakeResult({ provider: "custom-cache" });
    onBeforeResolve(() => cached);

    vi.stubGlobal("fetch", vi.fn());

    const { resolve } = await import("../src/resolver.js");
    await resolve("https://www.youtube.com/watch?v=abc123");

    expect(events).toHaveLength(1);
    expect(events[0].provider).toBe("custom-cache");
    expect(events[0].success).toBe(true);
    expect(events[0].cacheHit).toBe(false);
  });

  it("returns an unsubscribe function", async () => {
    const events: MetricsEvent[] = [];
    const unsubscribe = onMetrics((e) => events.push(e));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await resolve("https://www.youtube.com/watch?v=abc123");
    expect(events).toHaveLength(1);

    unsubscribe();
    await resolve("https://www.youtube.com/watch?v=abc123");
    expect(events).toHaveLength(1); // no new event
  });

  it("clearMetrics removes all callbacks", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));
    onMetrics((e) => events.push(e)); // second callback

    clearMetrics();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await resolve("https://www.youtube.com/watch?v=abc123");

    expect(events).toHaveLength(0);
  });

  it("runs multiple callbacks in registration order", async () => {
    const order: number[] = [];
    onMetrics(() => order.push(1));
    onMetrics(() => order.push(2));
    onMetrics(() => order.push(3));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await resolve("https://www.youtube.com/watch?v=abc123");

    expect(order).toEqual([1, 2, 3]);
  });

  it("emits metrics for provider-not-found error", async () => {
    const events: MetricsEvent[] = [];
    onMetrics((e) => events.push(e));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><head></head><body></body></html>",
        headers: new Headers({ "content-type": "text/html" }),
      }),
    );

    const { resolve } = await import("../src/resolver.js");
    await expect(
      resolve("https://unknown-site.example.com/page", {
        fallback: false,
        discovery: false,
      }),
    ).rejects.toThrow();

    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(false);
    expect(events[0].errorCode).toBe("PROVIDER_NOT_FOUND");
  });
});
