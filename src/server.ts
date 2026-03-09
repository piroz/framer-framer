import { Hono } from "hono";
import { EmbedError } from "./errors.js";
import { resolve } from "./resolver.js";
import type { EmbedOptions } from "./types.js";

export type { EmbedOptions } from "./types.js";

export interface ServerOptions {
  /** Base path prefix for all routes (e.g. "/api/v1") */
  basePath?: string;
  /** Default EmbedOptions applied to every request */
  defaultOptions?: EmbedOptions;
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

  return app;
}
