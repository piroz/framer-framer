import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/nuxt/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["vue", "framer-framer", "nuxt/app"],
});
