/**
 * Cloudflare Workers example for framer-framer
 *
 * Deploy: `wrangler deploy`
 *
 * Cloudflare Workers constraints:
 * - CPU time: 10ms (free) / 50ms (paid) — subrequest wait time is excluded
 * - Memory: 128MB
 * - Subrequests: 50 per invocation
 * - `setInterval` runs within the Worker's execution context;
 *   the rate limiter cleanup interval is per-isolate, not per-request
 */
import { createApp } from "framer-framer/server";

const app = createApp({
  rateLimit: {
    windowMs: 60_000,
    max: 30,
  },
});

export default app;
