# External Logger Integration Guide

Integrate [framer-framer](https://github.com/piroz/framer-framer) structured logging with external logging libraries.

## Overview

framer-framer emits structured log entries via the `Logger` interface. The built-in logger writes JSON to stderr, but you can provide your own `Logger` to route logs through pino, winston, or any other library.

## Logger Interface

```ts
import type { Logger, LogEntry } from "framer-framer";
```

The `Logger` interface has four methods matching standard log levels:

```ts
interface Logger {
  debug(entry: LogEntry): void;
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}
```

Each method receives a `LogEntry` with the following fields:

| Field | Type | Description |
|---|---|---|
| `level` | `"debug" \| "info" \| "warn" \| "error"` | Log level |
| `message` | `string` | `"embed resolved"` or `"embed failed"` |
| `timestamp` | `string` | ISO 8601 timestamp |
| `url` | `string` | The URL being resolved |
| `provider` | `string` | Provider name (e.g. `"youtube"`) |
| `latencyMs` | `number` | Resolution time in milliseconds |
| `status` | `string` | Resolution status (success entries only) |
| `errorCode` | `string` | Error code (failure entries only) |
| `errorMessage` | `string` | Error message (failure entries only) |

> `LogEntry` uses an index signature (`[key: string]: unknown`), so additional fields may appear in future versions without breaking changes.

## pino Integration

[pino](https://github.com/pinojs/pino) is a fast, low-overhead JSON logger for Node.js.

```ts
import pino from "pino";
import { embed, type Logger } from "framer-framer";

const pinoLogger = pino();

const logger: Logger = {
  debug: (entry) => pinoLogger.debug(entry, entry.message),
  info:  (entry) => pinoLogger.info(entry, entry.message),
  warn:  (entry) => pinoLogger.warn(entry, entry.message),
  error: (entry) => pinoLogger.error(entry, entry.message),
};

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
  logger,
});
```

pino accepts a merging object as the first argument and the message string as the second. This passes all `LogEntry` fields as structured data alongside the message.

### pino with custom serializers

If you want to control which fields appear in the output:

```ts
const pinoLogger = pino({
  serializers: {
    // Only include specific fields from LogEntry
    url: (url) => url,
    provider: (provider) => provider,
    latencyMs: (ms) => ms,
  },
});
```

## winston Integration

[winston](https://github.com/winstonjs/winston) is a multi-transport async logging library.

```ts
import winston from "winston";
import { embed, type Logger } from "framer-framer";

const winstonLogger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

const logger: Logger = {
  debug: (entry) => winstonLogger.debug(entry.message, entry),
  info:  (entry) => winstonLogger.info(entry.message, entry),
  warn:  (entry) => winstonLogger.warn(entry.message, entry),
  error: (entry) => winstonLogger.error(entry.message, entry),
};

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
  logger,
});
```

winston takes the message as the first argument and metadata as the second. The `LogEntry` fields (url, provider, latencyMs, etc.) are attached as metadata.

> **Note**: winston adds its own `timestamp` field when using `winston.format.timestamp()`. The `LogEntry.timestamp` field is preserved as a separate property in the metadata.

## Edge Runtime (Cloudflare Workers / Deno / Bun)

In Edge runtimes, the built-in logger (`logger: true`) works without modification since it uses only `console.error()` and `JSON.stringify()` — both available in all JavaScript runtimes.

```ts
import { embed } from "framer-framer";

// Works in Cloudflare Workers, Deno, and Bun
const result = await embed(url, { logger: true });
```

### Cloudflare Workers

In Cloudflare Workers, `console.log` / `console.error` output is captured by the Workers runtime. To view logs:

- **Development**: Use `wrangler dev` or `wrangler tail` to stream logs in real time
- **Production**: Use [Logpush](https://developers.cloudflare.com/workers/observability/logpush/) to send logs to external destinations (e.g. Datadog, S3, Splunk)
- **Workers Logs**: Use [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) for the built-in log storage

For structured logging in Workers, you can wrap the console output:

```ts
import { embed, type Logger } from "framer-framer";

const logger: Logger = {
  debug: (entry) => console.debug(JSON.stringify(entry)),
  info:  (entry) => console.info(JSON.stringify(entry)),
  warn:  (entry) => console.warn(JSON.stringify(entry)),
  error: (entry) => console.error(JSON.stringify(entry)),
};
```

This uses distinct console methods (`console.debug`, `console.info`, etc.) so the Workers runtime can filter by severity level in the dashboard.

### Deno

Deno supports `console` methods natively. For integration with Deno's built-in `std/log`:

```ts
import * as log from "https://deno.land/std/log/mod.ts";
import { embed, type Logger } from "framer-framer";

const logger: Logger = {
  debug: (entry) => log.debug(entry.message, entry),
  info:  (entry) => log.info(entry.message, entry),
  warn:  (entry) => log.warn(entry.message, entry),
  error: (entry) => log.error(entry.message, entry),
};
```

## Log Entry JSON Format

When using the built-in logger (`logger: true` or `createLogger()`), each log entry is written as a single JSON line to stderr. This format is compatible with most log aggregation tools.

### Success entry example

```json
{
  "level": "info",
  "message": "embed resolved",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "provider": "youtube",
  "latencyMs": 245,
  "status": "provider"
}
```

### Failure entry example

```json
{
  "level": "error",
  "message": "embed failed",
  "timestamp": "2024-01-15T10:30:01.000Z",
  "url": "https://example.com/invalid",
  "provider": "unknown",
  "latencyMs": 5012,
  "errorCode": "TIMEOUT",
  "errorMessage": "Request timed out after 5000ms"
}
```

### Status values

| Status | Description |
|---|---|
| `cache_hit` | Result served from cache |
| `provider` | Resolved by a matched provider |
| `discovery` | Resolved via oEmbed discovery |
| `ogp_fallback` | Fell back to OGP metadata extraction |
| `hook_short_circuit` | Short-circuited by a `onBeforeResolve` hook |
| `error_fallback` | Returned an error fallback result |

## Combining with Metrics

framer-framer also provides a metrics hook (`onMetrics()`) for operational monitoring. You can use both logging and metrics together:

```ts
import { embed, createLogger, onMetrics } from "framer-framer";

// Structured logging for debugging and audit
const logger = createLogger();

// Metrics for dashboards and alerting
onMetrics((event) => {
  // Send to your metrics backend (Prometheus, Datadog, etc.)
  console.log(`[metric] ${event.provider}: ${event.duration}ms success=${event.success}`);
});

await embed(url, { logger });
```

See the [README](../../README.md#metrics-hook) for more details on the metrics API.
