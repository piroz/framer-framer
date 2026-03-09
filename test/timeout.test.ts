import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWithOgp } from "../src/fallback/ogp.js";
import { YouTubeProvider } from "../src/providers/youtube.js";

describe("Timeout option", () => {
  let timeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    timeoutSpy = vi.spyOn(AbortSignal, "timeout");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("OEmbedProvider", () => {
    const provider = new YouTubeProvider();

    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              type: "video",
              html: "<iframe></iframe>",
              title: "Test",
            }),
        }),
      );
    });

    it("uses default timeout (10000ms) when not specified", async () => {
      await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

      expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    });

    it("passes custom timeout to AbortSignal.timeout()", async () => {
      await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        timeout: 5000,
      });

      expect(timeoutSpy).toHaveBeenCalledWith(5000);
    });
  });

  describe("OGP fallback", () => {
    const mockOgpFetch = () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () =>
            Promise.resolve(
              '<html><head><meta property="og:title" content="Test" /></head></html>',
            ),
        }),
      );
    };

    it("uses default timeout (10000ms) when not specified", async () => {
      mockOgpFetch();

      await resolveWithOgp("https://example.com/page");

      expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    });

    it("passes custom timeout to AbortSignal.timeout()", async () => {
      mockOgpFetch();

      await resolveWithOgp("https://example.com/page", { timeout: 3000 });

      expect(timeoutSpy).toHaveBeenCalledWith(3000);
    });
  });

  describe("timeout behavior", () => {
    it("aborts fetch when timeout expires", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          return new Promise((_resolve, reject) => {
            const onAbort = () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            };
            if (init.signal?.aborted) {
              onAbort();
              return;
            }
            init.signal?.addEventListener("abort", onAbort);
          });
        }),
      );

      const provider = new YouTubeProvider();
      await expect(
        provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
          timeout: 1,
          retry: { maxRetries: 0 },
        }),
      ).rejects.toThrow();
    });
  });
});
