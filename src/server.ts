import { Hono } from "hono";
import { EmbedError } from "./errors.js";
import { resolve, resolveBatch } from "./resolver.js";
import type { EmbedOptions, ProblemDetails, RateLimitOptions } from "./types.js";

export type { EmbedOptions, ProblemDetails, RateLimitOptions } from "./types.js";

const DEFAULT_MAX_URLS = 20;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 100;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/** Internal metrics collector for Prometheus exposition */
interface ServerMetrics {
  requestsTotal: Map<string, number>;
  errorsTotal: Map<string, number>;
  durationSum: number;
  durationCount: number;
}

function createMetrics(): ServerMetrics {
  return {
    requestsTotal: new Map(),
    errorsTotal: new Map(),
    durationSum: 0,
    durationCount: 0,
  };
}

function incrementCounter(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";

function formatPrometheus(metrics: ServerMetrics): string {
  const lines: string[] = [];

  lines.push("# HELP embed_requests_total Total number of embed requests");
  lines.push("# TYPE embed_requests_total counter");
  for (const [labels, count] of metrics.requestsTotal) {
    lines.push(`embed_requests_total{${labels}} ${count}`);
  }

  lines.push("# HELP embed_errors_total Total number of embed errors");
  lines.push("# TYPE embed_errors_total counter");
  for (const [labels, count] of metrics.errorsTotal) {
    lines.push(`embed_errors_total{${labels}} ${count}`);
  }

  lines.push("# HELP embed_duration_seconds Duration of embed resolution in seconds");
  lines.push("# TYPE embed_duration_seconds summary");
  lines.push(`embed_duration_seconds_sum ${metrics.durationSum}`);
  lines.push(`embed_duration_seconds_count ${metrics.durationCount}`);

  return `${lines.join("\n")}\n`;
}

const PROBLEM_JSON = "application/problem+json";

function problemResponse(
  c: { json: (data: unknown, status: number, headers?: Record<string, string>) => Response },
  status: number,
  code: string,
  detail: string,
  instance?: string,
): Response {
  const body: ProblemDetails = {
    type: "about:blank",
    title: detail,
    status,
    detail,
    code,
    ...(instance !== undefined && { instance }),
  };
  return c.json(body, status, { "Content-Type": PROBLEM_JSON });
}

export interface ServerOptions {
  /** Base path prefix for all routes (e.g. "/api/v1") */
  basePath?: string;
  /** Default EmbedOptions applied to every request */
  defaultOptions?: EmbedOptions;
  /** Rate limiting configuration. Omit to disable rate limiting. */
  rateLimit?: RateLimitOptions;
  /** Enable GET /metrics endpoint with Prometheus-format metrics (default: false) */
  metrics?: boolean;
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
        return problemResponse(
          c,
          429,
          "RATE_LIMITED",
          "Too many requests, please try again later",
          c.req.path,
        );
      }

      await next();
    });
  }

  const metrics = options?.metrics ? createMetrics() : undefined;

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  if (metrics) {
    app.get("/metrics", (c) => {
      return c.text(formatPrometheus(metrics), 200, {
        "Content-Type": PROMETHEUS_CONTENT_TYPE,
      });
    });
  }

  app.get("/embed", async (c) => {
    const url = c.req.query("url");
    if (!url) {
      return problemResponse(
        c,
        400,
        "VALIDATION_ERROR",
        "Missing required query parameter: url",
        c.req.path,
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

    const startTime = metrics ? Date.now() : 0;
    try {
      const result = await resolve(url, embedOptions);
      if (metrics) {
        const durationSec = (Date.now() - startTime) / 1000;
        metrics.durationSum += durationSec;
        metrics.durationCount++;
        incrementCounter(metrics.requestsTotal, `method="GET",path="/embed",status="200"`);
      }
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const code = err instanceof EmbedError ? err.code : "UNKNOWN";
      const status = code === "VALIDATION_ERROR" ? 400 : 422;
      if (metrics) {
        const durationSec = (Date.now() - startTime) / 1000;
        metrics.durationSum += durationSec;
        metrics.durationCount++;
        incrementCounter(metrics.requestsTotal, `method="GET",path="/embed",status="${status}"`);
        incrementCounter(metrics.errorsTotal, `code="${code}"`);
      }
      return problemResponse(c, status, code, message, c.req.path);
    }
  });

  app.post("/embed/batch", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return problemResponse(c, 400, "VALIDATION_ERROR", "Invalid JSON body", c.req.path);
    }

    if (!body || typeof body !== "object" || !("urls" in body)) {
      return problemResponse(
        c,
        400,
        "VALIDATION_ERROR",
        "Missing required field: urls",
        c.req.path,
      );
    }

    const { urls, maxWidth, maxHeight } = body as Record<string, unknown>;

    if (!Array.isArray(urls) || urls.length === 0) {
      return problemResponse(
        c,
        400,
        "VALIDATION_ERROR",
        "urls must be a non-empty array",
        c.req.path,
      );
    }

    if (urls.length > DEFAULT_MAX_URLS) {
      return problemResponse(
        c,
        400,
        "VALIDATION_ERROR",
        `Too many URLs: maximum is ${DEFAULT_MAX_URLS}`,
        c.req.path,
      );
    }

    if (!urls.every((u): u is string => typeof u === "string")) {
      return problemResponse(
        c,
        400,
        "VALIDATION_ERROR",
        "All items in urls must be strings",
        c.req.path,
      );
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

    const startTime = metrics ? Date.now() : 0;
    const batchResults = await resolveBatch(urls, embedOptions);

    if (metrics) {
      const durationSec = (Date.now() - startTime) / 1000;
      metrics.durationSum += durationSec;
      metrics.durationCount++;
      incrementCounter(metrics.requestsTotal, `method="POST",path="/embed/batch",status="200"`);
      for (const r of batchResults) {
        if (r instanceof EmbedError) {
          incrementCounter(metrics.errorsTotal, `code="${r.code}"`);
        }
      }
    }

    const results = batchResults.map((r) => {
      if (r instanceof EmbedError) {
        return {
          type: "about:blank",
          title: r.message,
          status: 422,
          detail: r.message,
          code: r.code,
        } satisfies ProblemDetails;
      }
      return r;
    });

    return c.json({ results });
  });

  return app;
}
