import { afterEach, describe, expect, it, vi } from "vitest";
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
  };
});

import { resolve } from "../src/resolver.js";
import { createApp } from "../src/server.js";

const mockedResolve = vi.mocked(resolve);

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
    it("returns 400 when url is missing", async () => {
      const app = createApp();
      const res = await app.request("/embed");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/url/i);
    });

    it("returns 400 for invalid URL", async () => {
      const app = createApp();
      const res = await app.request("/embed?url=not-a-url");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/invalid/i);
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

    it("returns 422 when resolve throws", async () => {
      mockedResolve.mockRejectedValueOnce(new Error("No provider found"));

      const app = createApp();
      const res = await app.request("/embed?url=https://unknown.example.com");

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toMatch(/No provider found/);
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
