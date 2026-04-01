/**
 * Deno example for framer-framer
 *
 * Run: `deno run --allow-net main.ts`
 *
 * Deno supports npm packages via the `npm:` specifier.
 * All Web standard APIs (fetch, URL, AbortController) are natively available.
 */
import { createApp } from "npm:framer-framer/server";

const app = createApp({
  rateLimit: {
    windowMs: 60_000,
    max: 100,
  },
});

Deno.serve({ port: 3000 }, app.fetch);
