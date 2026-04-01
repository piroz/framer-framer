/**
 * Bun example for framer-framer
 *
 * Run: `bun run index.ts`
 *
 * Bun has full npm compatibility — install framer-framer via `bun add framer-framer`.
 * All Web standard APIs (fetch, URL, AbortController) are natively available.
 */
import { createApp } from "framer-framer/server";

const app = createApp({
  rateLimit: {
    windowMs: 60_000,
    max: 100,
  },
});

export default {
  port: 3000,
  fetch: app.fetch,
};
