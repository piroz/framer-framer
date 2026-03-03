import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHooks, onAfterResolve, onBeforeResolve } from "../src/resolver.js";
import type { EmbedResult, HookContext } from "../src/types.js";

/**
 * These tests use a mock provider registered via the resolver internals.
 * We mock the resolve function's provider lookup so we can test hooks in isolation.
 */

// Minimal EmbedResult factory
function fakeResult(overrides?: Partial<EmbedResult>): EmbedResult {
  return {
    type: "video",
    html: "<iframe></iframe>",
    provider: "test",
    url: "https://example.com/video/1",
    ...overrides,
  };
}

// We dynamically import resolve so we can test the full pipeline.
// Provider resolution is tested separately; here we focus on hook execution.
// To avoid hitting real oEmbed APIs, we mock the fetch global.

describe("hooks", () => {
  afterEach(() => {
    clearHooks();
    vi.restoreAllMocks();
  });

  describe("onBeforeResolve", () => {
    it("runs before resolution and receives context", async () => {
      const seen: HookContext[] = [];
      onBeforeResolve((ctx) => {
        seen.push({ ...ctx });
      });

      // Mock fetch to return a valid oEmbed response
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ type: "video", html: "<iframe></iframe>" }),
        }),
      );

      const { resolve } = await import("../src/resolver.js");
      await resolve("https://www.youtube.com/watch?v=abc123");

      expect(seen).toHaveLength(1);
      expect(seen[0].url).toBe("https://www.youtube.com/watch?v=abc123");
      expect(seen[0].provider?.name).toBe("youtube");
    });

    it("short-circuits when returning an EmbedResult", async () => {
      const cached = fakeResult({ provider: "cache" });
      onBeforeResolve(() => cached);

      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const { resolve } = await import("../src/resolver.js");
      const result = await resolve("https://www.youtube.com/watch?v=abc123");

      expect(result).toEqual(cached);
      // fetch should never be called because we short-circuited
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("allows mutating context.url for downstream resolution", async () => {
      onBeforeResolve((ctx) => {
        // Rewrite URL
        ctx.url = "https://www.youtube.com/watch?v=rewritten";
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "video", html: "<iframe></iframe>" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { resolve } = await import("../src/resolver.js");
      await resolve("https://www.youtube.com/watch?v=original");

      // The fetch call should use the rewritten URL
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("rewritten");
      expect(calledUrl).not.toContain("original");
    });

    it("runs multiple hooks in registration order", async () => {
      const order: number[] = [];
      onBeforeResolve(() => {
        order.push(1);
      });
      onBeforeResolve(() => {
        order.push(2);
      });
      onBeforeResolve(() => fakeResult()); // third hook short-circuits

      const { resolve } = await import("../src/resolver.js");
      vi.stubGlobal("fetch", vi.fn());
      await resolve("https://www.youtube.com/watch?v=abc");

      expect(order).toEqual([1, 2]);
    });
  });

  describe("onAfterResolve", () => {
    it("receives the result and can observe it", async () => {
      const results: EmbedResult[] = [];
      onAfterResolve((_ctx, result) => {
        results.push(result);
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ type: "video", html: "<iframe>yt</iframe>" }),
        }),
      );

      const { resolve } = await import("../src/resolver.js");
      await resolve("https://www.youtube.com/watch?v=abc123");

      expect(results).toHaveLength(1);
      expect(results[0].html).toBe("<iframe>yt</iframe>");
    });

    it("replaces the result when returning an EmbedResult", async () => {
      onAfterResolve((_ctx, result) => ({
        ...result,
        html: `<div class="wrapper">${result.html}</div>`,
      }));

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ type: "video", html: "<iframe></iframe>" }),
        }),
      );

      const { resolve } = await import("../src/resolver.js");
      const result = await resolve("https://www.youtube.com/watch?v=abc123");

      expect(result.html).toBe('<div class="wrapper"><iframe></iframe></div>');
    });

    it("chains multiple after hooks", async () => {
      onAfterResolve((_ctx, result) => ({
        ...result,
        html: `<outer>${result.html}</outer>`,
      }));
      onAfterResolve((_ctx, result) => ({
        ...result,
        html: `<outermost>${result.html}</outermost>`,
      }));

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ type: "video", html: "<inner/>" }),
        }),
      );

      const { resolve } = await import("../src/resolver.js");
      const result = await resolve("https://www.youtube.com/watch?v=abc");

      expect(result.html).toBe("<outermost><outer><inner/></outer></outermost>");
    });

    it("also runs on short-circuited results from before hooks", async () => {
      const cached = fakeResult({ html: "<cached/>" });
      onBeforeResolve(() => cached);

      const transformed: string[] = [];
      onAfterResolve((_ctx, result) => {
        transformed.push(result.html);
      });

      vi.stubGlobal("fetch", vi.fn());

      const { resolve } = await import("../src/resolver.js");
      await resolve("https://www.youtube.com/watch?v=abc");

      expect(transformed).toEqual(["<cached/>"]);
    });
  });

  describe("clearHooks", () => {
    it("removes all registered hooks", async () => {
      onBeforeResolve(() => fakeResult({ html: "<short-circuit/>" }));
      onAfterResolve((_ctx, result) => ({ ...result, html: "<replaced/>" }));

      clearHooks();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ type: "video", html: "<from-api/>" }),
        }),
      );

      const { resolve } = await import("../src/resolver.js");
      const result = await resolve("https://www.youtube.com/watch?v=abc");

      // Neither hook should have run
      expect(result.html).toBe("<from-api/>");
    });
  });
});
