/** Log levels in increasing severity order */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured log entry */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** Additional structured data */
  [key: string]: unknown;
}

/** Logger interface for custom logger implementations */
export interface Logger {
  debug(entry: LogEntry): void;
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}

/** Built-in JSON logger that writes to stderr */
export function createLogger(): Logger {
  function log(entry: LogEntry): void {
    console.error(JSON.stringify(entry));
  }

  return {
    debug: log,
    info: log,
    warn: log,
    error: log,
  };
}

/**
 * Resolve the logger from EmbedOptions.
 * - `true` → built-in JSON logger
 * - `Logger` object → use as-is
 * - `false` / `undefined` → no logging (returns undefined)
 */
export function resolveLogger(logger: Logger | boolean | undefined): Logger | undefined {
  if (logger === true) return createLogger();
  if (logger && typeof logger === "object") return logger;
  return undefined;
}
