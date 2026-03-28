# framer-framer

[![CI](https://github.com/piroz/framer-framer/actions/workflows/ci.yml/badge.svg)](https://github.com/piroz/framer-framer/actions/workflows/ci.yml)

Universal embed resolver for Node.js — extract embed HTML from any URL using oEmbed APIs.

Supports YouTube, X/Twitter, TikTok, Flickr, Facebook, Instagram, Threads, Vimeo, Spotify, SoundCloud, SlideShare, Speaker Deck, Pinterest, Reddit, Mastodon, Niconico, Hugging Face Spaces, Gradio, Bluesky, note out of the box, with oEmbed auto-discovery and OGP metadata fallback for any other URL. Zero runtime dependencies.

**[Playground](https://framer-framer.velocitylabo.dev/)** — Try it in the browser

## Install

```bash
npm install framer-framer
```

Requires Node.js 22+.

## Usage

```ts
import { embed } from "framer-framer";

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
console.log(result.html);     // <iframe width="200" height="113" src="..." ...>
console.log(result.type);     // "video"
console.log(result.title);    // "Rick Astley - Never Gonna Give You Up ..."
console.log(result.provider); // "youtube"
```

### Platform-specific functions

```ts
import {
  youtube, twitter, tiktok, flickr, facebook, instagram, threads,
  vimeo, spotify, soundcloud, slideshare, speakerdeck, pinterest, reddit, mastodon, niconico, huggingface, gradio, bluesky, note,
} from "framer-framer";

await youtube("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
await twitter("https://x.com/user/status/123456789");
await tiktok("https://www.tiktok.com/@user/video/123456789");
await flickr("https://www.flickr.com/photos/username/12345678901");
await vimeo("https://vimeo.com/76979871");
await spotify("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8");
await soundcloud("https://soundcloud.com/artist/track");
await slideshare("https://www.slideshare.net/user/presentation-title");
await speakerdeck("https://speakerdeck.com/speaker/my-presentation");
await pinterest("https://www.pinterest.com/pin/123456789/");
await reddit("https://www.reddit.com/r/typescript/comments/abc123/my_post/");
await mastodon("https://mastodon.social/@Gargron/109370844932549021");
await niconico("https://www.nicovideo.jp/watch/sm9");
await niconico("https://live.nicovideo.jp/watch/lv123456789"); // live streams
await huggingface("https://huggingface.co/spaces/stabilityai/stable-diffusion");
await gradio("https://user-app.hf.space");
await bluesky("https://bsky.app/profile/bsky.app/post/3jxmszpoehs27");

// Facebook / Instagram / Threads require a Meta access token
await facebook("https://www.facebook.com/video/123", {
  auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
});
await instagram("https://www.instagram.com/p/ABC123/", {
  auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
});
await threads("https://www.threads.net/@zuck/post/CuXFPIvSEvG", {
  auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
});
```

### Batch resolution

Resolve multiple URLs in parallel with concurrency control. Individual failures are returned as `EmbedError` instances rather than throwing, so partial success is always possible.

```ts
import { embedBatch, EmbedError } from "framer-framer";

const results = await embedBatch([
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://x.com/user/status/123456789",
  "https://vimeo.com/76979871",
], { concurrency: 3 });

for (const result of results) {
  if (result instanceof EmbedError) {
    console.error(result.code, result.message);
  } else {
    console.log(result.provider, result.html);
  }
}
```

| Option        | Type     | Default | Description                          |
| ------------- | -------- | ------- | ------------------------------------ |
| `concurrency` | `number` | `5`     | Maximum number of parallel requests  |

All other `EmbedOptions` (e.g. `maxWidth`, `cache`, `timeout`) are passed through to each individual resolution.

> **Timeout behavior:** The `timeout` option applies to each URL independently, not to the batch as a whole. Each URL gets its own `AbortSignal.timeout()`, so a slow URL will not affect the timeout of other URLs in the batch.

### URL auto-expansion

Automatically detect and expand URLs in text or HTML to embed HTML. Ideal for CMS and blog engines.

```ts
import { expandUrls } from "framer-framer";

const text = 'Check this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ and read more at [my blog](https://example.com)';
const expanded = await expandUrls(text);
// URLs are replaced with embed HTML; Markdown links are preserved
```

#### HTML mode

```ts
const html = '<p>Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ here</p>';
const expanded = await expandUrls(html, { format: "html" });
// Bare URLs in text content are expanded; URLs in href/src attributes are preserved
```

#### Exclude patterns

```ts
const expanded = await expandUrls(text, {
  exclude: [
    "https://example.com",      // prefix match
    /^https?:\/\/private\./,    // regex match
  ],
});
```

#### Error handling

URLs that fail to resolve (e.g. timeout, invalid provider response) are left unchanged in the output — no errors are thrown for individual URL failures.

#### ExpandOptions

| Option        | Type                       | Default  | Description                                |
| ------------- | -------------------------- | -------- | ------------------------------------------ |
| `format`      | `"text" \| "html"`         | `"text"` | Input format (text/Markdown or HTML)        |
| `concurrency` | `number`                   | `5`      | Maximum number of parallel URL resolutions  |
| `exclude`     | `(string \| RegExp)[]`     | —        | URL patterns to skip (prefix match or regex)|

All other `EmbedOptions` (e.g. `maxWidth`, `cache`, `timeout`) are passed through to each resolution.

### Options

```ts
await embed(url, {
  maxWidth: 640,              // Max embed width
  maxHeight: 480,             // Max embed height
  fallback: true,             // OGP fallback for unknown URLs (default: true)
  auth: {                     // Authentication configuration
    meta: {                   // Required for Facebook/Instagram/Threads
      accessToken: "APP_ID|CLIENT_TOKEN",
    },
  },
  retry: {                    // Retry on transient failures (network errors, 5xx, 429)
    maxRetries: 2,            // default: 2
    baseDelay: 500,           // default: 500ms, exponential backoff: delay = baseDelay * 2^attempt
  },
  timeout: 5000,              // Per-request timeout in ms (default: 10000) — applies to oEmbed, OGP fallback, and discovery
  sanitize: true,             // Sanitize oEmbed HTML to prevent XSS (default: true)
  discovery: true,            // oEmbed auto-discovery for unknown URLs (default: true)
  cache: myCache,             // EmbedCache instance (see Caching section)
  logger: true,               // Enable built-in JSON logger (see Logging section)
  accessibility: true,        // Add ARIA attributes to embeds (default: true) — see Accessibility section
});
```

### HTML sanitization

oEmbed HTML responses are sanitized by default to prevent XSS. Only whitelisted tags and attributes are preserved; `<script>` tags are only allowed from trusted provider domains (e.g. `platform.twitter.com`, `www.tiktok.com`).

Disable per-call with `sanitize: false`:

```ts
await embed(url, { sanitize: false });
```

You can also use the sanitizer directly:

```ts
import { sanitizeHtml } from "framer-framer";

const safe = sanitizeHtml('<iframe src="https://example.com"></iframe><script>alert("xss")</script>');
// → '<iframe src="https://example.com"></iframe>'
```

Allowed tags: `iframe`, `blockquote`, `img`, `a`, `p`, `div`, `span`, `script` (trusted domains only), `br`, `strong`, `em`.

### Accessibility

Embed HTML is automatically enhanced with ARIA attributes for screen readers and keyboard navigation (enabled by default).

Attributes added to `<iframe>` and `<blockquote>` elements:
- `title` — from the oEmbed response title (if not already present)
- `aria-label` — format: `"provider: title"` (e.g. `"youtube: My Video"`)
- `tabindex="0"` — enables keyboard focus

Customize or disable per-call:

```ts
// Custom aria-label
await embed(url, { accessibility: { ariaLabel: "Custom label" } });

// Custom tabIndex and role
await embed(url, { accessibility: { tabIndex: -1, role: "document" } });

// Disable accessibility enhancement
await embed(url, { accessibility: false });
```

The `enhanceAccessibility()` utility is also exported for standalone use:

```ts
import { enhanceAccessibility } from "framer-framer";

const html = enhanceAccessibility('<iframe src="..."></iframe>', result);
```

React and Vue components add `role="region"` and `aria-label` to the container element, and `aria-busy="true"` during loading.

### URL validation

All URLs are validated before resolution for security (SSRF protection). The following checks are applied automatically:

- **Protocol**: Only `http` and `https` are allowed
- **Private IPs**: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0`, `::1` are rejected
- **IPv4-mapped IPv6**: `[::ffff:10.0.0.1]` etc. are also rejected
- **Numeric IPs**: Decimal (`2130706433`), hex (`0x7f000001`), and octal (`0177.0.0.1`) representations are normalised and checked
- **Localhost**: `localhost` is rejected
- **URL length**: Maximum 2048 characters

Invalid URLs throw an `EmbedError` with code `VALIDATION_ERROR`.

> **Note:** URL validation operates on the URL string only and does not perform DNS resolution. Hostnames that resolve to private IPs at runtime (DNS rebinding) are not detected. For full SSRF protection in production, combine this with network-level controls such as egress firewall rules or a DNS-resolving proxy.

You can also use the validation function directly:

```ts
import { validateUrl } from "framer-framer";

validateUrl("https://example.com"); // ok
validateUrl("http://127.0.0.1");    // throws EmbedError (VALIDATION_ERROR)
validateUrl("http://2130706433");   // throws (decimal IP = 127.0.0.1)
```

### oEmbed auto-discovery

For URLs that don't match any built-in provider, framer-framer automatically looks for `<link rel="alternate" type="application/json+oembed">` tags in the page HTML. If found, the oEmbed endpoint is used to resolve the embed — no provider registration required.

Resolution order: **Provider match → oEmbed discovery → OGP fallback**

Disable with `discovery: false`:

```ts
await embed("https://unknown-site.com/post/123", { discovery: false });
```

You can also use the discovery functions directly:

```ts
import { discoverOEmbedUrl, resolveWithDiscovery } from "framer-framer";

// Just find the oEmbed endpoint URL
const oembedUrl = await discoverOEmbedUrl("https://example.com/post");

// Full resolve via discovery (returns undefined if no oEmbed link found)
const result = await resolveWithDiscovery("https://example.com/post");
```

### OGP fallback

URLs that don't match any built-in provider and have no oEmbed discovery link are resolved via OGP meta tags automatically. Disable with `fallback: false`.

```ts
const result = await embed("https://example.com/article", { fallback: true });
// Returns link card HTML built from og:title, og:description, og:image
```

### Logging

Structured JSON logging for observability. Logs resolution success/failure, latency, provider, and cache hits.

```ts
// Built-in JSON logger (writes to stderr)
await embed(url, { logger: true });
```

#### `createLogger()` — create a reusable logger instance

```ts
import { createLogger, embed } from "framer-framer";

const logger = createLogger();

// Reuse across multiple calls
await embed(url1, { logger });
await embed(url2, { logger });
```

`createLogger()` returns a `Logger` object that writes JSON to stderr. Pass it to `logger` in `EmbedOptions` to share a single logger across calls.

#### Custom logger

Provide your own `Logger` implementation to integrate with existing logging libraries (e.g. pino, winston):

```ts
import type { Logger } from "framer-framer";

const myLogger: Logger = {
  debug: (entry) => pino.debug(entry),
  info: (entry) => pino.info(entry),
  warn: (entry) => pino.warn(entry),
  error: (entry) => pino.error(entry),
};

await embed(url, { logger: myLogger });
```

Log entries include:

| Field | Type | Description |
|---|---|---|
| `level` | `string` | `"debug"` `"info"` `"warn"` `"error"` |
| `message` | `string` | `"embed resolved"` or `"embed failed"` |
| `timestamp` | `string` | ISO 8601 timestamp |
| `url` | `string` | The URL being resolved |
| `provider` | `string` | Provider name (e.g. `"youtube"`) |
| `latencyMs` | `number` | Resolution time in milliseconds |
| `status` | `string` | `"provider"` `"discovery"` `"ogp_fallback"` `"cache_hit"` `"hook_short_circuit"` |

### Caching

Built-in LRU cache eliminates redundant network calls for repeated URLs.

```ts
import { createCache, embed } from "framer-framer";

const cache = createCache({ maxSize: 200, ttl: 60_000 }); // 200 entries, 1 min TTL

const result = await embed("https://www.youtube.com/watch?v=abc", { cache });
// Second call returns instantly from cache — no network request
await embed("https://www.youtube.com/watch?v=abc", { cache });
```

`createCache()` options:

| Option    | Type     | Default  | Description                      |
| --------- | -------- | -------- | -------------------------------- |
| `maxSize` | `number` | `100`    | Maximum number of cached entries |
| `ttl`     | `number` | `300000` | Time-to-live in milliseconds     |

The cache key includes the URL and dimension options (`maxWidth`, `maxHeight`), so different option combinations are cached separately.

Set `cache: false` to explicitly disable caching for a single call when a cache is normally used.

```ts
await cache.delete("https://www.youtube.com/watch?v=abc"); // remove a specific entry
await cache.clear(); // remove all cached entries
```

#### Custom cache adapter

Implement the `CacheAdapter` interface to use any cache backend (Redis, Cloudflare KV, etc.):

```ts
import type { CacheAdapter } from "framer-framer";
import type { EmbedResult } from "framer-framer";

class RedisCacheAdapter implements CacheAdapter {
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  async get(key: string): Promise<EmbedResult | undefined> {
    const raw = await this.redis.get(`embed:${key}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  async set(key: string, value: EmbedResult, ttl?: number): Promise<void> {
    await this.redis.set(`embed:${key}`, JSON.stringify(value), "EX", ttl ?? 300);
  }

  async delete(key: string): Promise<boolean> {
    return (await this.redis.del(`embed:${key}`)) > 0;
  }

  async clear(): Promise<void> {
    // Implementation depends on your Redis setup
  }
}

const cache = new RedisCacheAdapter(redisClient);
await embed(url, { cache });
```

### Responsive wrapper

Wrap embed HTML in a responsive container that maintains aspect ratio using the CSS padding-bottom technique.

```ts
import { wrapResponsive } from "framer-framer";

// With known dimensions — aspect ratio is preserved
const html = wrapResponsive('<iframe src="https://www.youtube.com/embed/abc"></iframe>', {
  width: 640,
  height: 360,
});
// → nested divs with padding-bottom: 56.25% for 16:9 aspect ratio

// Without dimensions — simple width: 100% wrapper
const html = wrapResponsive('<iframe src="..."></iframe>');

// Use CSS class names instead of inline styles
const html = wrapResponsive('<iframe src="..."></iframe>', {
  width: 640,
  height: 360,
  mode: "class",
  className: "my-embed", // default: "embed-responsive"
});
// → <div class="my-embed"><div class="my-embed__ratio" style="padding-bottom:56.2500%"><div class="my-embed__inner">...</div></div></div>
```

`ResponsiveOptions`:

| Option      | Type     | Default             | Description                                        |
| ----------- | -------- | ------------------- | -------------------------------------------------- |
| `width`     | `number` | —                   | Embed width (for aspect ratio calculation)         |
| `height`    | `number` | —                   | Embed height (for aspect ratio calculation)        |
| `maxWidth`  | `string` | `"100%"`            | Maximum width constraint (inline mode only)        |
| `mode`      | `string` | `"inline"`          | `"inline"` for style attributes, `"class"` for CSS class names |
| `className` | `string` | `"embed-responsive"` | CSS class name prefix (class mode only)           |
### Provider query API

Check which providers are registered and whether a URL can be embedded.

```ts
import { getProviders, canEmbed } from "framer-framer";

// List all registered providers
const providers = getProviders();
// [{ name: "youtube", patterns: ["^https?:\\/\\/(www\\.)?youtube\\.com\\/watch\\?", ...] }, ...]

// Check if a URL can be resolved by a registered provider
canEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"); // true
canEmbed("https://example.com/page");                      // false
```

`canEmbed()` only checks registered providers (built-in + custom). It does not attempt oEmbed auto-discovery or OGP fallback.

`ProviderInfo` type:

| Field                | Type       | Description                                  |
| -------------------- | ---------- | -------------------------------------------- |
| `name`               | `string`   | Provider name (e.g. `"youtube"`)             |
| `patterns`           | `string[]` | URL regex patterns (as regex source strings) |
| `defaultAspectRatio` | `string?`  | Default aspect ratio hint (e.g. `"16:9"`, `"1:1"`) |
| `embedType`          | `string?`  | oEmbed content type hint (`"rich"`, `"video"`, `"photo"`, `"link"`) |
| `supportsMaxWidth`   | `boolean?` | Whether the provider supports the `maxWidth` parameter |

### Custom providers

#### Declarative definition

Define providers with a simple schema — no class boilerplate needed:

```ts
import { defineProvider, defineProviders, registerProvider } from "framer-framer";

// Single provider
const dailymotion = defineProvider({
  name: "dailymotion",
  endpoint: "https://www.dailymotion.com/services/oembed",
  urlPatterns: ["https://www.dailymotion.com/video/*"],
});
registerProvider(dailymotion);

// Multiple providers at once
const [providerA, providerB] = defineProviders([
  {
    name: "provider-a",
    endpoint: "https://a.example.com/oembed",
    urlPatterns: [/^https?:\/\/a\.example\.com\//],
  },
  {
    name: "provider-b",
    endpoint: "https://b.example.com/oembed",
    urlPatterns: ["https://b.example.com/**"],
  },
]);
```

`ProviderSchema`:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Provider name |
| `endpoint` | `string` | oEmbed endpoint URL |
| `urlPatterns` | `(string \| RegExp)[]` | URL patterns (glob strings or RegExp) |
| `defaultAspectRatio` | `string?` | Default aspect ratio hint (e.g. `"16:9"`) |
| `embedType` | `string?` | oEmbed content type hint (`"rich"`, `"video"`, `"photo"`, `"link"`) |
| `supportsMaxWidth` | `boolean?` | Whether the provider supports `maxWidth` (default: `true`) |
| `options.transform` | `(data, url) => EmbedResult` | Custom response transform |

Glob patterns support `*` (any characters except `/`) and `**` (any characters including `/`).

##### Custom response transform

```ts
const provider = defineProvider({
  name: "custom",
  endpoint: "https://custom.example.com/oembed",
  urlPatterns: ["https://custom.example.com/**"],
  options: {
    transform: (data, url) => ({
      type: "rich",
      html: `<div class="custom-embed">${data.html}</div>`,
      provider: "custom",
      title: data.title as string,
      url,
    }),
  },
});
```

#### Class-based definition

```ts
import { registerProvider, OEmbedProvider } from "framer-framer";

class DailymotionProvider extends OEmbedProvider {
  name = "dailymotion";
  protected patterns = [/dailymotion\.com\/video\//];
  protected endpoint = "https://www.dailymotion.com/services/oembed";
}

registerProvider(new DailymotionProvider());
```

### Hooks

Hooks let you intercept every `resolve()` call — useful for caching, analytics, HTML wrapping, and more. All resolution paths (`embed()`, `youtube()`, etc.) go through hooks. Hooks run once per resolution (outside the retry loop) — `onBeforeResolve` fires before the first attempt, and `onAfterResolve` fires after the final result.

```ts
import { onBeforeResolve, onAfterResolve, clearHooks } from "framer-framer";
```

#### `onBeforeResolve(hook)` — runs before resolution

Return an `EmbedResult` to short-circuit (skip the provider call). Mutate `context.url` or `context.options` to alter downstream behavior.

```ts
// Cache example
const unsubscribe = onBeforeResolve((context) => {
  const cached = cache.get(context.url);
  if (cached) return cached; // skip provider, return cached result
});
```

#### `onAfterResolve(hook)` — runs after resolution

Observe or transform the result. Return an `EmbedResult` to replace it.

```ts
// Analytics
onAfterResolve((context, result) => {
  trackEvent("embed_resolved", { url: context.url, provider: result.provider });
});

// Wrap HTML
onAfterResolve((context, result) => ({
  ...result,
  html: `<div data-embed-url="${context.url}">${result.html}</div>`,
}));
```

#### Unsubscribe

Both functions return an unsubscribe function to remove the specific hook.

```ts
const unsubscribe = onAfterResolve((ctx, result) => { /* ... */ });
unsubscribe(); // removes only this hook
```

#### `clearHooks()` — remove all hooks

```ts
clearHooks(); // removes all before and after hooks
```

### Metrics

Monitor resolution performance with the `onMetrics()` hook. Each resolution emits a `MetricsEvent` with provider name, duration, success/failure, cache hit status, and error code.

```ts
import { onMetrics, clearMetrics } from "framer-framer";
```

#### `onMetrics(callback)` — observe resolution metrics

```ts
const unsubscribe = onMetrics((event) => {
  console.log(`${event.provider}: ${event.duration}ms (${event.success ? "ok" : event.errorCode})`);
});

// MetricsEvent fields:
// - url: string           — resolved URL
// - provider: string      — provider name ('youtube', 'ogp', 'discovery', etc.)
// - duration: number      — resolution time in ms (0 for cache hits)
// - success: boolean      — whether resolution succeeded
// - cacheHit: boolean     — whether result was served from cache
// - errorCode?: string    — error code if resolution failed
```

#### Unsubscribe

```ts
const unsubscribe = onMetrics((event) => { /* ... */ });
unsubscribe(); // removes only this callback
```

#### Integration with external systems

The `onMetrics()` hook can bridge to any external observability system. No built-in adapters are provided — the callback interface is intentionally minimal so you can integrate without adding runtime dependencies.

**OpenTelemetry example:**

```ts
import { trace, metrics as otelMetrics } from "@opentelemetry/api";
import { onMetrics } from "framer-framer";

const tracer = trace.getTracer("framer-framer");
const meter = otelMetrics.getMeter("framer-framer");
const requestCounter = meter.createCounter("embed.requests");

onMetrics((event) => {
  requestCounter.add(1, { provider: event.provider, success: String(event.success) });
});
```

#### `clearMetrics()` — remove all metrics callbacks

```ts
clearMetrics();
```

### REST API server

`framer-framer/server` exports a Hono-based REST API app. Requires `hono` as a peer dependency.

```bash
npm install hono
```

#### Basic usage

```ts
import { serve } from "@hono/node-server";
import { createApp } from "framer-framer/server";

const app = createApp();
serve({ fetch: app.fetch, port: 3000 });
```

#### Endpoints

| Method | Path           | Description                          |
| ------ | -------------- | ------------------------------------ |
| GET    | `/health`      | Health check (`{ status: "ok" }`)    |
| GET    | `/providers`   | List registered providers            |
| GET    | `/embed`       | Resolve a URL to embed data          |
| POST   | `/embed/batch` | Resolve multiple URLs in one request |
| GET    | `/metrics`     | Prometheus-format metrics (requires `metrics: true`) |

**`GET /embed` query parameters:**

| Parameter   | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `url`       | `string` | **(required)** URL to resolve        |
| `maxWidth`  | `number` | Max embed width                      |
| `maxHeight` | `number` | Max embed height                     |
| `fallback`  | `string` | Set to `"false"` to disable OGP fallback |
| `sanitize`  | `string` | Set to `"false"` to disable HTML sanitization |
| `discovery` | `string` | Set to `"false"` to disable oEmbed auto-discovery |

For Facebook/Instagram/Threads, pass the Meta access token via the `Authorization` header:

```
Authorization: Bearer APP_ID|CLIENT_TOKEN
```

**`POST /embed/batch` request body:**

```json
{
  "urls": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://x.com/user/status/123"],
  "maxWidth": 640,
  "maxHeight": 480
}
```

| Field       | Type       | Description                           |
| ----------- | ---------- | ------------------------------------- |
| `urls`      | `string[]` | **(required)** URLs to resolve (max 20) |
| `maxWidth`  | `number`   | Max embed width                       |
| `maxHeight` | `number`   | Max embed height                      |

**Response:**

```json
{
  "results": [
    { "type": "video", "html": "<iframe ...>", "provider": "youtube", "url": "..." },
    { "type": "about:blank", "title": "oEmbed API returned 404", "status": 422, "detail": "oEmbed API returned 404", "code": "OEMBED_FETCH_FAILED" }
  ]
}
```

Each item in `results` is either an `EmbedResult` on success or a [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) object on failure. The array order matches the input `urls` order. Partial failures do not affect other results.

#### Error responses

All error responses use the [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) format with `Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "oEmbed API returned 404",
  "status": 422,
  "detail": "oEmbed API returned 404",
  "code": "OEMBED_FETCH_FAILED",
  "instance": "/embed"
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `type` | `string` | Problem type URI (always `"about:blank"`) |
| `title` | `string` | Short human-readable summary |
| `status` | `number` | HTTP status code |
| `detail` | `string` | Human-readable explanation |
| `code` | `string` | Application-specific error code (see [Error codes](#error-codes)) |
| `instance` | `string?` | Request path that caused the error |

| Status | Code | Description |
| ------ | ---- | ----------- |
| 400 | `VALIDATION_ERROR` | Missing or invalid `url` parameter |
| 422 | `<EmbedErrorCode>` | Resolution failed (see [Error codes](#error-codes)) |
| 422 | `UNKNOWN` | Unexpected error without a specific code |

#### ServerOptions

```ts
createApp({
  basePath: "/api/v1",           // prefix all routes
  defaultOptions: {              // default EmbedOptions for every request
    maxWidth: 640,
    fallback: true,
  },
  rateLimit: {                   // IP-based rate limiting (omit to disable)
    windowMs: 60_000,            // time window in ms (default: 60000)
    max: 100,                    // max requests per window per IP (default: 100)
  },
  metrics: true,                 // enable GET /metrics endpoint (default: false)
});
```

#### Full server example with caching, logging, and rate limiting

```ts
import { serve } from "@hono/node-server";
import { createApp } from "framer-framer/server";
import { createCache, createLogger } from "framer-framer";

const cache = createCache({ maxSize: 500, ttl: 300_000 });
const logger = createLogger();

const app = createApp({
  basePath: "/api/v1",
  defaultOptions: {
    maxWidth: 800,
    cache,
    logger,
    timeout: 5000,
  },
  rateLimit: {
    windowMs: 60_000,
    max: 60,
  },
  metrics: true,
});

serve({ fetch: app.fetch, port: 3000 });
// GET  http://localhost:3000/api/v1/embed?url=...
// POST http://localhost:3000/api/v1/embed/batch
// GET  http://localhost:3000/api/v1/metrics
```

#### Metrics

When `metrics: true` is set, a `GET /metrics` endpoint is exposed with Prometheus text exposition format (`Content-Type: text/plain; version=0.0.4; charset=utf-8`).

Available metrics:

| Metric                    | Type    | Labels                       | Description                           |
| ------------------------- | ------- | ---------------------------- | ------------------------------------- |
| `embed_requests_total`    | counter | `method`, `path`, `status`   | Total number of embed requests        |
| `embed_errors_total`      | counter | `code`                       | Total number of embed errors          |
| `embed_duration_seconds`  | summary | —                            | Duration of embed resolution          |

When rate limiting is enabled, all responses include the following headers:

| Header                | Description                              |
| --------------------- | ---------------------------------------- |
| `X-RateLimit-Limit`   | Maximum requests allowed per window      |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset`   | Unix timestamp (seconds) when the window resets |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header (seconds until reset).

> **Design note:** Rate limiting uses an in-memory, per-process IP counter. For multi-process or distributed deployments, an external store (e.g. Redis) adapter is planned for a future release. Provider-specific rate limits are intentionally not supported — the uniform IP-based approach keeps configuration simple while covering the most common use case.

#### Using as a sub-app

```ts
import { Hono } from "hono";
import { createApp } from "framer-framer/server";

const main = new Hono();
main.route("/oembed", createApp());
```

#### Enabling CORS

```ts
import { cors } from "hono/cors";
import { createApp } from "framer-framer/server";

const app = createApp();
app.use("*", cors({ origin: "https://example.com" }));
```

## Migration from v2.x

### `meta` → `auth.meta`

The `meta` option has moved under a new `auth` namespace:

```ts
// Before (v2.x) — still works but deprecated
await embed(url, { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } });

// After (v3.x)
await embed(url, { auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } } });
```

### `resolve()` → `embed()`

> **Deprecated**: `resolve()` is deprecated and will be removed in **v4.0.0**. Use `embed()` instead — both functions are identical.

```ts
// Before (v2.x)
import { resolve } from "framer-framer";
const result = await resolve(url);

// After (v3.x)
import { embed } from "framer-framer";
const result = await embed(url);
```

## Known limitations

### SlideShare new URL format

SlideShare's new URL format (`https://www.slideshare.net/slideshow/<slug>/<id>`) is not supported by their oEmbed API. If you pass a new-format URL, framer-framer will throw an `EmbedError` with code `OEMBED_FETCH_FAILED` suggesting to use the legacy URL format (`https://www.slideshare.net/<user>/<slug>`).

## Error handling

All errors thrown by framer-framer are instances of `EmbedError`, which extends `Error` with a `code` property for programmatic error handling.

```ts
import { embed, EmbedError } from "framer-framer";

try {
  await embed("https://example.com/video");
} catch (err) {
  if (err instanceof EmbedError) {
    console.log(err.code);    // e.g. "OEMBED_FETCH_FAILED"
    console.log(err.message); // human-readable description
    console.log(err.cause);   // original error (if any)
  }
}
```

### Error codes

| Code                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `PROVIDER_NOT_FOUND`  | No provider matched and fallback is disabled     |
| `OEMBED_FETCH_FAILED` | oEmbed API returned a non-OK HTTP status         |
| `OEMBED_PARSE_ERROR`  | oEmbed API response could not be parsed as JSON  |
| `OGP_FETCH_FAILED`    | OGP fallback: page fetch returned a non-OK status |
| `OGP_PARSE_ERROR`     | OGP fallback: metadata extraction failed         |
| `VALIDATION_ERROR`    | Invalid input (e.g. missing Meta access token, unsafe URL) |
| `TIMEOUT`             | Request timed out                                |

`EmbedError` also supports `toJSON()` for structured logging:

```ts
console.log(JSON.stringify(err));
// {"name":"EmbedError","code":"OEMBED_FETCH_FAILED","message":"..."}
```

## EmbedResult

| Field             | Type     | Description                       |
| ----------------- | -------- | --------------------------------- |
| `type`            | `string` | `"rich"` `"video"` `"photo"` `"link"` |
| `html`            | `string` | Embed HTML                        |
| `provider`        | `string` | Provider name                     |
| `url`             | `string` | Original URL                      |
| `title`           | `string?` | Content title                    |
| `author_name`     | `string?` | Author name                      |
| `author_url`      | `string?` | Author URL                       |
| `thumbnail_url`   | `string?` | Thumbnail image URL              |
| `thumbnail_width` | `number?` | Thumbnail width                  |
| `thumbnail_height`| `number?` | Thumbnail height                 |
| `width`           | `number?` | Embed width                      |
| `height`          | `number?` | Embed height                     |
| `raw`             | `object?` | Raw oEmbed response              |

## Project structure

This project uses npm workspaces as a monorepo:

```
packages/
  core/     # framer-framer (this library)
```

Root-level npm scripts delegate to the corresponding workspace:

```bash
npm run ci          # lint + typecheck + test + build (all workspaces)
npm test            # run tests
npm run build       # build
npm run lint        # lint
npm run typecheck   # type check
```

## Development

### Render check

Visually verify that all providers render correctly in a browser:

```bash
node tools/render-check.mjs          # build, resolve all providers, serve on :8765
node tools/render-check.mjs --port 3333
node tools/render-check.mjs --no-serve  # generate HTML only
```

Facebook/Instagram/Threads require a Meta access token via env var:

```bash
META_ACCESS_TOKEN=APP_ID|CLIENT_TOKEN node tools/render-check.mjs
```

## License

MIT
