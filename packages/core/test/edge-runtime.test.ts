import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = resolve(__dirname, "../src");

/**
 * Collect all .ts source files under packages/core/src/
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Edge runtime compatibility", () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);

  // server.ts is excluded because it depends on Hono (a peer dependency)
  // and is imported separately via "framer-framer/server"
  const coreFiles = sourceFiles.filter((f) => !f.endsWith("/server.ts"));

  describe("No node: prefixed imports in core library", () => {
    for (const file of coreFiles) {
      const relativePath = file.replace(`${SRC_DIR}/`, "");
      it(`${relativePath} does not import node: modules`, () => {
        const content = readFileSync(file, "utf-8");
        const nodeImports = content.match(
          /(?:from\s+["']|import\s*\(?\s*["']|require\s*\(\s*["'])node:/g,
        );
        expect(nodeImports, `Found node: import in ${relativePath}`).toBeNull();
      });
    }
  });

  describe("No require() calls in core library", () => {
    for (const file of coreFiles) {
      const relativePath = file.replace(`${SRC_DIR}/`, "");
      it(`${relativePath} does not use require()`, () => {
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
          const requireMatch = trimmed.match(/\brequire\s*\(/);
          if (requireMatch) {
            expect.fail(`Found require() call in ${relativePath}: ${trimmed}`);
          }
        }
      });
    }
  });

  describe("Web standard API usage verification", () => {
    it("uses only Web standard fetch (no node-fetch import)", () => {
      for (const file of coreFiles) {
        const content = readFileSync(file, "utf-8");
        const nodeFetchImport = content.match(/(?:from\s+["']|require\s*\(\s*["'])node-fetch/g);
        expect(
          nodeFetchImport,
          `Found node-fetch import in ${file.replace(`${SRC_DIR}/`, "")}`,
        ).toBeNull();
      }
    });

    it("core source files exist and are non-empty", () => {
      expect(sourceFiles.length).toBeGreaterThan(0);
      expect(coreFiles.length).toBeGreaterThan(0);
    });
  });

  describe("package.json exports configuration", () => {
    const pkgPath = resolve(__dirname, "../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    it("provides both ESM and CJS entry points", () => {
      expect(pkg.exports["."]).toBeDefined();
      expect(pkg.exports["."].import).toBeDefined();
      expect(pkg.exports["."].require).toBeDefined();
    });

    it("provides type definitions", () => {
      expect(pkg.exports["."].types).toBeDefined();
    });

    it("provides server subpath export", () => {
      expect(pkg.exports["./server"]).toBeDefined();
      expect(pkg.exports["./server"].import).toBeDefined();
      expect(pkg.exports["./server"].require).toBeDefined();
    });

    it("has zero runtime dependencies", () => {
      expect(pkg.dependencies).toBeUndefined();
    });
  });
});
