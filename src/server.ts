import { Hono } from "hono";
import { EmbedError } from "./errors.js";
import { resolve, resolveBatch } from "./resolver.js";
import type { EmbedOptions, RateLimitOptions } from "./types.js";

export type { EmbedOptions, RateLimitOptions } from "./types.js";

const DEFAULT_MAX_URLS = 20;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 100;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface ServerOptions {
  /** Base path prefix for all routes (e.g. "/api/v1") */
  basePath?: string;
  /** Default EmbedOptions applied to every request */
  defaultOptions?: EmbedOptions;
  /** Rate limiting configuration. Omit to disable rate limiting. */
  rateLimit?: RateLimitOptions;
}

/**
 * Create a Hono app that exposes the embed resolver as a REST API.
 *
 * @example Basic usage
 * ```ts
 * import { serve } from '@hono/node-server';
 * import { createApp } from 'framer-framer/server';
 *
 * const app = createApp();
 * serve({ fetch: app.fetch, port: 3000 });
 * ```
 *
 * @example Using as a sub-app
 * ```ts
 * import { Hono } from 'hono';
 * import { createApp } from 'framer-framer/server';
 *
 * const main = new Hono();
 * main.route('/oembed', createApp());
 * ```
 *
 * @example Enabling CORS
 * ```ts
 * import { Hono } from 'hono';
 * import { cors } from 'hono/cors';
 * import { createApp } from 'framer-framer/server';
 *
 * const app = createApp();
 * app.use('*', cors({ origin: 'https://example.com' }));
 * ```
 *
 * @remarks
 * **Meta (Facebook/Instagram) access tokens** — Pass the token via the
 * `Authorization` header (`Bearer APP_ID|CLIENT_TOKEN`) instead of query
 * parameters to avoid leaking credentials in server logs or browser history.
 */
export function createApp(options?: ServerOptions): Hono {
  const app = options?.basePath ? new Hono().basePath(options.basePath) : new Hono();

  if (options?.rateLimit) {
    const windowMs = options.rateLimit.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
    const max = options.rateLimit.max ?? DEFAULT_RATE_LIMIT_MAX;
    const clients = new Map<string, RateLimitEntry>();

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of clients) {
        if (now >= entry.resetTime) {
          clients.delete(ip);
        }
      }
    }, windowMs);
    if (
      typeof cleanupInterval === "object" &&
      cleanupInterval !== null &&
      "unref" in cleanupInterval
    ) {
      (cleanupInterval as { unref: () => void }).unref();
    }

    app.use("*", async (c, next) => {
      const ip =
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        "unknown";

      const now = Date.now();
      let entry = clients.get(ip);

      if (!entry || now >= entry.resetTime) {
        entry = { count: 0, resetTime: now + windowMs };
        clients.set(ip, entry);
      }

      entry.count++;

      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        return c.json(
          { error: "Too many requests, please try again later", code: "RATE_LIMITED" },
          429,
        );
      }

      await next();
    });
  }

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  app.get("/embed", async (c) => {
    const url = c.req.query("url");
    if (!url) {
      return c.json(
        { error: "Missing required query parameter: url", code: "VALIDATION_ERROR" },
        400,
      );
    }

    const embedOptions: EmbedOptions = {
      ...options?.defaultOptions,
    };

    const maxWidth = c.req.query("maxWidth");
    if (maxWidth) {
      const n = Number(maxWidth);
      if (Number.isFinite(n) && n > 0) embedOptions.maxWidth = n;
    }

    const maxHeight = c.req.query("maxHeight");
    if (maxHeight) {
      const n = Number(maxHeight);
      if (Number.isFinite(n) && n > 0) embedOptions.maxHeight = n;
    }

    // Extract access token from Authorization header (Bearer scheme)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      embedOptions.meta = { accessToken: authHeader.slice(7) };
    }

    const fallback = c.req.query("fallback");
    if (fallback === "false") {
      embedOptions.fallback = false;
    }

    const sanitize = c.req.query("sanitize");
    if (sanitize === "false") {
      embedOptions.sanitize = false;
    }

    const discovery = c.req.query("discovery");
    if (discovery === "false") {
      embedOptions.discovery = false;
    }

    try {
      const result = await resolve(url, embedOptions);
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const code = err instanceof EmbedError ? err.code : "UNKNOWN";
      const status = code === "VALIDATION_ERROR" ? 400 : 422;
      const details = err instanceof Error && err.cause ? err.cause : undefined;
      return c.json({ error: message, code, ...(details !== undefined && { details }) }, status);
    }
  });

  app.post("/embed/batch", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, 400);
    }

    if (!body || typeof body !== "object" || !("urls" in body)) {
      return c.json({ error: "Missing required field: urls", code: "VALIDATION_ERROR" }, 400);
    }

    const { urls, maxWidth, maxHeight } = body as Record<string, unknown>;

    if (!Array.isArray(urls) || urls.length === 0) {
      return c.json({ error: "urls must be a non-empty array", code: "VALIDATION_ERROR" }, 400);
    }

    if (urls.length > DEFAULT_MAX_URLS) {
      return c.json(
        {
          error: `Too many URLs: maximum is ${DEFAULT_MAX_URLS}`,
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    if (!urls.every((u): u is string => typeof u === "string")) {
      return c.json({ error: "All items in urls must be strings", code: "VALIDATION_ERROR" }, 400);
    }

    const embedOptions: EmbedOptions = {
      ...options?.defaultOptions,
    };

    if (typeof maxWidth === "number" && Number.isFinite(maxWidth) && maxWidth > 0) {
      embedOptions.maxWidth = maxWidth;
    }

    if (typeof maxHeight === "number" && Number.isFinite(maxHeight) && maxHeight > 0) {
      embedOptions.maxHeight = maxHeight;
    }

    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      embedOptions.meta = { accessToken: authHeader.slice(7) };
    }

    const batchResults = await resolveBatch(urls, embedOptions);

    const results = batchResults.map((r) => {
      if (r instanceof EmbedError) {
        return { error: r.message, code: r.code };
      }
      return r;
    });

    return c.json({ results });
  });

  return app;
}
