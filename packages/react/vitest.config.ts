import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.tsx", "test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "framer-framer": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
});
