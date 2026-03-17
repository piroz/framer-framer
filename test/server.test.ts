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

  describe("GET /providers", () => {
    it("returns a list of registered providers", async () => {
      const app = createApp();
      const res = await app.request("/providers");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.providers).toBeInstanceOf(Array);
      expect(body.providers.length).toBeGreaterThanOrEqual(17);
      const names = body.providers.map((p: { name: string }) => p.name);
      expect(names).toContain("youtube");
      expect(names).toContain("twitter");
    });

    it("includes patterns for each provider", async () => {
      const app = createApp();
      const res = await app.request("/providers");
      const body = await res.json();
      const youtube = body.providers.find((p: { name: string }) => p.name === "youtube");
      expect(youtube.patterns).toBeInstanceOf(Array);
      expect(youtube.patterns.length).toBeGreaterThan(0);
    });

    it("works with basePath option", async () => {
      const app = createApp({ basePath: "/api/v1" });
      const res = await app.request("/api/v1/providers");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.providers).toBeInstanceOf(Array);
    });
  });

  describe("GET /embed", () => {
    it("returns 400 with RFC 7807 Problem Details when url is missing", async () => {
      const app = createApp();
      const res = await app.request("/embed");
      expect(res.status).toBe(400);
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        title: expect.stringMatching(/url/i),
        status: 400,
        detail: expect.stringMatching(/url/i),
        code: "VALIDATION_ERROR",
        instance: "/embed",
      });
    });

    it("returns 400 with VALIDATION_ERROR code for invalid URL", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("VALIDATION_ERROR", "Invalid URL: not-a-url"),
      );

      const app = createApp();
      const res = await app.request("/embed?url=not-a-url");
      expect(res.status).toBe(400);
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        status: 400,
        detail: expect.stringMatching(/invalid/i),
        code: "VALIDATION_ERROR",
      });
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
      expect(body.type).toBe("about:blank");
      expect(body.status).toBe(400);
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
        expect.objectContaining({ auth: { meta: { accessToken: "APP|TOKEN" } } }),
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
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        title: "No provider found",
        status: 422,
        detail: "No provider found",
        code: "UNKNOWN",
      });
    });

    it("returns 422 with EmbedError code when resolve throws an EmbedError", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404"),
      );

      const app = createApp();
      const res = await app.request("/embed?url=https://example.com/video");

      expect(res.status).toBe(422);
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        title: "oEmbed API returned 404",
        status: 422,
        detail: "oEmbed API returned 404",
        code: "OEMBED_FETCH_FAILED",
      });
    });

    it("includes instance field with request path", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404"),
      );

      const app = createApp();
      const res = await app.request("/embed?url=https://example.com/video");

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.instance).toBe("/embed");
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
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        status: 400,
        code: "VALIDATION_ERROR",
      });
    });

    it("returns 400 when urls field is missing", async () => {
      const app = createApp();
      const res = await postBatch(app, {});
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toMatch(/urls/);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.type).toBe("about:blank");
    });

    it("returns 400 when urls is an empty array", async () => {
      const app = createApp();
      const res = await postBatch(app, { urls: [] });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.type).toBe("about:blank");
    });

    it("returns 400 when urls exceeds maximum limit", async () => {
      const app = createApp();
      const urls = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`);
      const res = await postBatch(app, { urls });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toMatch(/maximum/i);
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

    it("returns RFC 7807 error objects for failed URLs alongside successful results", async () => {
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
        type: "about:blank",
        title: "oEmbed API returned 404",
        status: 422,
        detail: "oEmbed API returned 404",
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
        expect.objectContaining({ auth: { meta: { accessToken: "APP|TOKEN" } } }),
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

  describe("rateLimit", () => {
    it("does not apply rate limiting when rateLimit is not configured", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp();
      for (let i = 0; i < 5; i++) {
        const res = await app.request("/embed?url=https://example.com");
        expect(res.status).toBe(200);
        expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
      }
    });

    it("allows requests within the rate limit", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ rateLimit: { max: 3, windowMs: 60000 } });
      for (let i = 0; i < 3; i++) {
        const res = await app.request(
          new Request("http://localhost/embed?url=https://example.com", {
            headers: { "X-Forwarded-For": "1.2.3.4" },
          }),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
        expect(res.headers.get("X-RateLimit-Remaining")).toBe(String(3 - (i + 1)));
      }
    });

    it("returns 429 when rate limit is exceeded", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ rateLimit: { max: 2, windowMs: 60000 } });

      // Use up the limit
      for (let i = 0; i < 2; i++) {
        await app.request(
          new Request("http://localhost/embed?url=https://example.com", {
            headers: { "X-Forwarded-For": "1.2.3.4" },
          }),
        );
      }

      // Next request should be rate limited
      const res = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Forwarded-For": "1.2.3.4" },
        }),
      );
      expect(res.status).toBe(429);
      expect(res.headers.get("Content-Type")).toContain("application/problem+json");
      const body = await res.json();
      expect(body).toMatchObject({
        type: "about:blank",
        status: 429,
        detail: expect.stringMatching(/too many requests/i),
        code: "RATE_LIMITED",
      });
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("tracks different IPs independently", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ rateLimit: { max: 1, windowMs: 60000 } });

      const res1 = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Forwarded-For": "1.1.1.1" },
        }),
      );
      expect(res1.status).toBe(200);

      const res2 = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Forwarded-For": "2.2.2.2" },
        }),
      );
      expect(res2.status).toBe(200);

      // First IP should be rate limited
      const res3 = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Forwarded-For": "1.1.1.1" },
        }),
      );
      expect(res3.status).toBe(429);
    });

    it("applies rate limiting to all endpoints including health", async () => {
      const app = createApp({ rateLimit: { max: 1, windowMs: 60000 } });

      const res1 = await app.request(
        new Request("http://localhost/health", {
          headers: { "X-Forwarded-For": "1.2.3.4" },
        }),
      );
      expect(res1.status).toBe(200);

      const res2 = await app.request(
        new Request("http://localhost/health", {
          headers: { "X-Forwarded-For": "1.2.3.4" },
        }),
      );
      expect(res2.status).toBe(429);
    });

    it("uses X-Real-IP header when X-Forwarded-For is not present", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ rateLimit: { max: 1, windowMs: 60000 } });

      const res1 = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Real-IP": "10.0.0.1" },
        }),
      );
      expect(res1.status).toBe(200);

      const res2 = await app.request(
        new Request("http://localhost/embed?url=https://example.com", {
          headers: { "X-Real-IP": "10.0.0.1" },
        }),
      );
      expect(res2.status).toBe(429);
    });
  });

  describe("GET /metrics", () => {
    it("returns 404 when metrics is not enabled", async () => {
      const app = createApp();
      const res = await app.request("/metrics");
      expect(res.status).toBe(404);
    });

    it("returns Prometheus-format text with correct content type", async () => {
      const app = createApp({ metrics: true });
      const res = await app.request("/metrics");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/plain; version=0.0.4; charset=utf-8");
      const body = await res.text();
      expect(body).toContain("# HELP embed_requests_total");
      expect(body).toContain("# TYPE embed_requests_total counter");
      expect(body).toContain("# HELP embed_errors_total");
      expect(body).toContain("# TYPE embed_errors_total counter");
      expect(body).toContain("# HELP embed_duration_seconds");
      expect(body).toContain("# TYPE embed_duration_seconds summary");
      expect(body).toContain("embed_duration_seconds_sum 0");
      expect(body).toContain("embed_duration_seconds_count 0");
    });

    it("tracks successful embed requests", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ metrics: true });
      await app.request("/embed?url=https://www.youtube.com/watch?v=abc");
      await app.request("/embed?url=https://www.youtube.com/watch?v=def");

      const res = await app.request("/metrics");
      const body = await res.text();
      expect(body).toContain('embed_requests_total{method="GET",path="/embed",status="200"} 2');
      expect(body).toContain("embed_duration_seconds_count 2");
    });

    it("tracks failed embed requests and errors", async () => {
      mockedResolve.mockRejectedValueOnce(
        new EmbedError("OEMBED_FETCH_FAILED", "oEmbed API returned 404"),
      );

      const app = createApp({ metrics: true });
      await app.request("/embed?url=https://example.com/fail");

      const res = await app.request("/metrics");
      const body = await res.text();
      expect(body).toContain('embed_requests_total{method="GET",path="/embed",status="422"} 1');
      expect(body).toContain('embed_errors_total{code="OEMBED_FETCH_FAILED"} 1');
    });

    it("tracks batch requests and per-item errors", async () => {
      mockedResolveBatch.mockResolvedValueOnce([
        fakeResult(),
        new EmbedError("OEMBED_FETCH_FAILED", "fail"),
      ]);

      const app = createApp({ metrics: true });
      await app.request("/embed/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: ["https://www.youtube.com/watch?v=1", "https://fail.example.com"],
        }),
      });

      const res = await app.request("/metrics");
      const body = await res.text();
      expect(body).toContain(
        'embed_requests_total{method="POST",path="/embed/batch",status="200"} 1',
      );
      expect(body).toContain('embed_errors_total{code="OEMBED_FETCH_FAILED"} 1');
      expect(body).toContain("embed_duration_seconds_count 1");
    });

    it("works with basePath option", async () => {
      const app = createApp({ basePath: "/api/v1", metrics: true });
      const res = await app.request("/api/v1/metrics");
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("# HELP embed_requests_total");
    });

    it("accumulates duration across requests", async () => {
      mockedResolve.mockResolvedValue(fakeResult());

      const app = createApp({ metrics: true });
      await app.request("/embed?url=https://www.youtube.com/watch?v=abc");

      const res = await app.request("/metrics");
      const body = await res.text();
      const match = body.match(/embed_duration_seconds_sum (\S+)/);
      expect(match).toBeTruthy();
      const sum = Number(match?.[1]);
      expect(sum).toBeGreaterThanOrEqual(0);
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
