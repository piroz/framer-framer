import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbedError } from "../src/errors.js";
import type { EmbedResult } from "../src/types.js";

function fakeResult(overrides?: Partial<EmbedResult>): EmbedResult {
  return {
    type: "video",
    html: "<iframe></iframe>",
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Test Video",
    ...overrides,
  };
}

// Mock the resolver so we never hit real oEmbed APIs
vi.mock("../src/resolver.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/resolver.js")>();
  return {
    ...original,
    resolve: vi.fn(),
    resolveBatch: vi.fn(),
  };
});

import { resolve, resolveBatch } from "../src/resolver.js";
import { createApp } from "../src/server.js";

const mockedResolve = vi.mocked(resolve);
const mockedResolveBatch = vi.mocked(resolveBatch);

describe("server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("returns ok status", async () => {
      const app = createApp();
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
    });
  });

  describe("GET /embed", () => {
    it("returns 400 with VALIDATION_ERROR code when url is missing", async () => {
      const app = createApp();
      const res = await app.request("/embed");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/url/i);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 with VALIDATION_ERROR code for invalid URL", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("VALIDATION_ERROR", "Invalid URL: not-a-url"),
      );

      const app = createApp();
      const res = await app.request("/embed?url=not-a-url");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/invalid/i);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when resolve throws VALIDATION_ERROR for private IP", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError(
          "VALIDATION_ERROR",
          "URLs pointing to private or loopback addresses are not allowed",
        ),
      );

      const app = createApp();
      const res = await app.request("/embed?url=http://127.0.0.1");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("resolves a valid URL and returns embed result", async () => {
      const result = fakeResult();
      mockedResolve.mockResolvedValueOnce(result);

      const app = createApp();
      const res = await app.request("/embed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.html).toBe("<iframe></iframe>");
      expect(body.provider).toBe("youtube");
      expect(mockedResolve).toHaveBeenCalledWith(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        expect.objectContaining({}),
      );
    });

    it("passes maxWidth and maxHeight to resolve", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp();
      await app.request("/embed?url=https://example.com&maxWidth=640&maxHeight=480");

      expect(mockedResolve).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ maxWidth: 640, maxHeight: 480 }),
      );
    });

    it("passes accessToken from Authorization header", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp();
      const req = new Request("http://localhost/embed?url=https://facebook.com/post/1", {
        headers: { Authorization: "Bearer APP|TOKEN" },
      });
      await app.request(req);

      expect(mockedResolve).toHaveBeenCalledWith(
        "https://facebook.com/post/1",
        expect.objectContaining({ meta: { accessToken: "APP|TOKEN" } }),
      );
    });

    it("ignores Authorization header without Bearer scheme", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp();
      const req = new Request("http://localhost/embed?url=https://example.com", {
        headers: { Authorization: "Basic abc123" },
      });
      await app.request(req);

      expect(mockedResolve).toHaveBeenCalledWith(
        "https://example.com",
        expect.not.objectContaining({ meta: expect.anything() }),
      );
    });

    it("disables fallback when fallback=false", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp();
      await app.request("/embed?url=https://example.com&fallback=false");

      expect(mockedResolve).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ fallback: false }),
      );
    });

    it("disables sanitize when sanitize=false", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp();
      await app.request("/embed?url=https://example.com&sanitize=false");

      expect(mockedResolve).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ sanitize: false }),
      );
    });

    it("returns 422 with UNKNOWN code when resolve throws a plain Error", async () => {
      mockedResolve.mockRejectedValueOnce(new Error("No provider found"));

      const app = createApp();
      const res = await app.request("/embed?url=https://unknown.example.com");

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toMatch(/No provider found/);
      expect(body.code).toBe("UNKNOWN");
      expect(body.details).toBeUndefined();
    });

    it("returns 422 with EmbedError code when resolve throws an EmbedError", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404"),
      );

      const app = createApp();
      const res = await app.request("/embed?url=https://example.com/video");

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("oEmbed API returned 404");
      expect(body.code).toBe("OEMBED_FETCH_FAILED");
      expect(body.details).toBeUndefined();
    });

    it("includes details when EmbedError has a cause", async () => {
      const cause = { status: 404, statusText: "Not Found" };
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404", { cause }),
      );

      const app = createApp();
      const res = await app.request("/embed?url=https://example.com/video");

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("oEmbed API returned 404");
      expect(body.code).toBe("OEMBED_FETCH_FAILED");
      expect(body.details).toEqual(cause);
    });
  });

  describe("POST /embed/batch", () => {
    function postBatch(
      app: ReturnType<typeof createApp>,
      body: unknown,
      headers?: Record<string, string>,
    ) {
      return app.request("/embed/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
    }

    it("returns 400 when body is not valid JSON", async () => {
      const app = createApp();
      const res = await app.request("/embed/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when urls field is missing", async () => {
      const app = createApp();
      const res = await postBatch(app, {});
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/urls/);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when urls is an empty array", async () => {
      const app = createApp();
      const res = await postBatch(app, { urls: [] });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when urls exceeds maximum limit", async () => {
      const app = createApp();
      const urls = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`);
      const res = await postBatch(app, { urls });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/maximum/i);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when urls contains non-string items", async () => {
      const app = createApp();
      const res = await postBatch(app, { urls: ["https://example.com", 123] });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("resolves multiple URLs and returns results array", async () => {
      const result1 = fakeResult({ url: "https://www.youtube.com/watch?v=1" });
      const result2 = fakeResult({ url: "https://www.youtube.com/watch?v=2" });
      mockedResolveBatch.mockResolvedValueOnce([result1, result2]);

      const app = createApp();
      const res = await postBatch(app, {
        urls: ["https://www.youtube.com/watch?v=1", "https://www.youtube.com/watch?v=2"],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(2);
      expect(body.results[0].url).toBe("https://www.youtube.com/watch?v=1");
      expect(body.results[1].url).toBe("https://www.youtube.com/watch?v=2");
    });

    it("returns error objects for failed URLs alongside successful results", async () => {
      mockedResolveBatch.mockResolvedValueOnce([
        fakeResult(),
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404"),
      ]);

      const app = createApp();
      const res = await postBatch(app, {
        urls: ["https://www.youtube.com/watch?v=1", "https://example.com/fail"],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(2);
      expect(body.results[0].html).toBe("<iframe></iframe>");
      expect(body.results[1]).toEqual({
        error: "oEmbed API returned 404",
        code: "OEMBED_FETCH_FAILED",
      });
    });

    it("passes maxWidth and maxHeight from request body", async () => {
      mockedResolveBatch.mockResolvedValueOnce([fakeResult()]);

      const app = createApp();
      await postBatch(app, {
        urls: ["https://example.com"],
        maxWidth: 640,
        maxHeight: 480,
      });

      expect(mockedResolveBatch).toHaveBeenCalledWith(
        ["https://example.com"],
        expect.objectContaining({ maxWidth: 640, maxHeight: 480 }),
      );
    });

    it("passes accessToken from Authorization header", async () => {
      mockedResolveBatch.mockResolvedValueOnce([fakeResult()]);

      const app = createApp();
      await postBatch(
        app,
        { urls: ["https://facebook.com/post/1"] },
        { Authorization: "Bearer APP|TOKEN" },
      );

      expect(mockedResolveBatch).toHaveBeenCalledWith(
        ["https://facebook.com/post/1"],
        expect.objectContaining({ meta: { accessToken: "APP|TOKEN" } }),
      );
    });

    it("applies defaultOptions from ServerOptions", async () => {
      mockedResolveBatch.mockResolvedValueOnce([fakeResult()]);

      const app = createApp({ defaultOptions: { maxWidth: 800 } });
      await postBatch(app, { urls: ["https://example.com"] });

      expect(mockedResolveBatch).toHaveBeenCalledWith(
        ["https://example.com"],
        expect.objectContaining({ maxWidth: 800 }),
      );
    });

    it("works with basePath option", async () => {
      mockedResolveBatch.mockResolvedValueOnce([fakeResult()]);

      const app = createApp({ basePath: "/api/v1" });
      const res = await app.request("/api/v1/embed/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: ["https://example.com"] }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("basePath option", () => {
    it("mounts routes under the specified base path", async () => {
      const app = createApp({ basePath: "/api/v1" });

      const healthRes = await app.request("/api/v1/health");
      expect(healthRes.status).toBe(200);

      mockedResolve.mockResolvedValueOnce(fakeResult());
      const embedRes = await app.request(
        "/api/v1/embed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
      expect(embedRes.status).toBe(200);
    });
  });

  describe("defaultOptions", () => {
    it("merges default options with request params", async () => {
      mockedResolve.mockResolvedValueOnce(fakeResult());

      const app = createApp({
        defaultOptions: { maxWidth: 800, fallback: false },
      });
      await app.request("/embed?url=https://example.com&maxWidth=640");

      // Request-level maxWidth should override default
      expect(mockedResolve).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ maxWidth: 640, fallback: false }),
      );
    });
  });
});
