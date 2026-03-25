import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbedError } from "../src/errors.js";
import { resolveBatch } from "../src/resolver.js";

describe("resolveBatch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for empty input", async () => {
    const results = await resolveBatch([]);
    expect(results).toEqual([]);
  });

  it("resolves multiple URLs in parallel", async () => {
    const fetchMock = vi.fn();

    // YouTube oEmbed response
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "video",
          html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
          provider_name: "YouTube",
          title: "Test Video",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await resolveBatch([
      "https://www.youtube.com/watch?v=abc",
      "https://www.youtube.com/watch?v=def",
    ]);

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r).not.toBeInstanceOf(EmbedError);
      expect((r as { provider: string }).provider).toBe("youtube");
    }
  });

  it("returns EmbedError for failed URLs without throwing", async () => {
    const fetchMock = vi.fn();

    // First URL succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "video",
          html: "<iframe></iframe>",
          provider_name: "YouTube",
          title: "OK",
        }),
    });

    // Second URL fails (oEmbed 404)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await resolveBatch([
      "https://www.youtube.com/watch?v=abc",
      "https://www.youtube.com/watch?v=invalid",
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).not.toBeInstanceOf(EmbedError);
    expect(results[1]).toBeInstanceOf(EmbedError);
    expect((results[1] as EmbedError).code).toBe("OEMBED_FETCH_FAILED");
  });

  it("returns EmbedError for validation failures", async () => {
    const results = await resolveBatch(["http://127.0.0.1", "ftp://example.com"]);

    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(EmbedError);
    expect((results[0] as EmbedError).code).toBe("VALIDATION_ERROR");
    expect(results[1]).toBeInstanceOf(EmbedError);
    expect((results[1] as EmbedError).code).toBe("VALIDATION_ERROR");
  });

  it("preserves input order", async () => {
    const fetchMock = vi.fn();

    // Use different response times to verify ordering
    fetchMock.mockImplementation((url: string) => {
      const id = url.includes("youtube") ? "YouTube" : "Vimeo";
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: `<iframe>${id}</iframe>`,
            provider_name: id,
            title: id,
          }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await resolveBatch([
      "https://www.youtube.com/watch?v=abc",
      "https://vimeo.com/76979871",
    ]);

    expect(results).toHaveLength(2);
    expect((results[0] as { provider: string }).provider).toBe("youtube");
    expect((results[1] as { provider: string }).provider).toBe("vimeo");
  });

  it("respects concurrency option", async () => {
    let activeCalls = 0;
    let maxActiveCalls = 0;

    const fetchMock = vi.fn().mockImplementation(() => {
      activeCalls++;
      if (activeCalls > maxActiveCalls) maxActiveCalls = activeCalls;
      return new Promise((resolve) => {
        setTimeout(() => {
          activeCalls--;
          resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                type: "video",
                html: "<iframe></iframe>",
                provider_name: "YouTube",
                title: "Test",
              }),
          });
        }, 10);
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 6 }, (_, i) => `https://www.youtube.com/watch?v=video${i}`);

    await resolveBatch(urls, { concurrency: 2 });

    expect(maxActiveCalls).toBeLessThanOrEqual(2);
  });

  it("uses default concurrency of 5", async () => {
    let activeCalls = 0;
    let maxActiveCalls = 0;

    const fetchMock = vi.fn().mockImplementation(() => {
      activeCalls++;
      if (activeCalls > maxActiveCalls) maxActiveCalls = activeCalls;
      return new Promise((resolve) => {
        setTimeout(() => {
          activeCalls--;
          resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                type: "video",
                html: "<iframe></iframe>",
                provider_name: "YouTube",
                title: "Test",
              }),
          });
        }, 10);
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 10 }, (_, i) => `https://www.youtube.com/watch?v=video${i}`);

    await resolveBatch(urls);

    expect(maxActiveCalls).toBeLessThanOrEqual(5);
    expect(maxActiveCalls).toBeGreaterThan(1);
  });

  it("passes embed options to individual resolve calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "video",
          html: "<iframe></iframe>",
          provider_name: "YouTube",
          title: "Test",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await resolveBatch(["https://www.youtube.com/watch?v=abc"], {
      maxWidth: 640,
      maxHeight: 480,
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("maxwidth=640");
    expect(calledUrl).toContain("maxheight=480");
  });
});
