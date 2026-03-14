import { describe, expect, it, vi } from "vitest";
import type { LogEntry, Logger } from "../../src/utils/logger.js";
import { createLogger, resolveLogger } from "../../src/utils/logger.js";

describe("createLogger", () => {
  it("creates a logger with all log level methods", () => {
    const logger = createLogger();
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("outputs JSON to stderr via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger();

    const entry: LogEntry = {
      level: "info",
      message: "test message",
      timestamp: "2026-03-14T00:00:00.000Z",
      url: "https://example.com",
    };

    logger.info(entry);

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.url).toBe("https://example.com");

    spy.mockRestore();
  });

  it("outputs all log levels via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger();

    const entry: LogEntry = {
      level: "debug",
      message: "test",
      timestamp: "2026-03-14T00:00:00.000Z",
    };

    logger.debug({ ...entry, level: "debug" });
    logger.info({ ...entry, level: "info" });
    logger.warn({ ...entry, level: "warn" });
    logger.error({ ...entry, level: "error" });

    expect(spy).toHaveBeenCalledTimes(4);

    spy.mockRestore();
  });
});

describe("resolveLogger", () => {
  it("returns built-in logger when true", () => {
    const logger = resolveLogger(true);
    expect(logger).toBeDefined();
    expect(typeof logger?.info).toBe("function");
  });

  it("returns custom logger when Logger object is passed", () => {
    const custom: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = resolveLogger(custom);
    expect(logger).toBe(custom);
  });

  it("returns undefined when false", () => {
    expect(resolveLogger(false)).toBeUndefined();
  });

  it("returns undefined when undefined", () => {
    expect(resolveLogger(undefined)).toBeUndefined();
  });
});
