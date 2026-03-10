# framer-framer

[![CI](https://github.com/piroz/framer-framer/actions/workflows/ci.yml/badge.svg)](https://github.com/piroz/framer-framer/actions/workflows/ci.yml)

Universal embed resolver for Node.js — extract embed HTML from any URL using oEmbed APIs.

Supports YouTube, X/Twitter, TikTok, Facebook, Instagram, Vimeo, Spotify, SoundCloud, Hugging Face Spaces, v0.dev, Gradio out of the box, with OGP metadata fallback for any other URL. Zero runtime dependencies.

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
  youtube, twitter, tiktok, facebook, instagram,
  vimeo, spotify, soundcloud, huggingface, v0, gradio,
} from "framer-framer";

await youtube("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
await twitter("https://x.com/user/status/123456789");
await tiktok("https://www.tiktok.com/@user/video/123456789");
await vimeo("https://vimeo.com/76979871");
await spotify("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8");
await soundcloud("https://soundcloud.com/artist/track");
await huggingface("https://huggingface.co/spaces/stabilityai/stable-diffusion");
await v0("https://v0.dev/t/abc123");
await gradio("https://user-app.hf.space");

// Facebook / Instagram require a Meta access token
await facebook("https://www.facebook.com/video/123", {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
await instagram("https://www.instagram.com/p/ABC123/", {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
```

### Options

```ts
await embed(url, {
  maxWidth: 640,              // Max embed width
  maxHeight: 480,             // Max embed height
  fallback: true,             // OGP fallback for unknown URLs (default: true)
  meta: {                     // Required for Facebook/Instagram
    accessToken: "APP_ID|CLIENT_TOKEN",
  },
  retry: {                    // Retry on transient failures (network errors, 5xx, 429)
    maxRetries: 2,            // default: 2
    baseDelay: 500,           // default: 500ms, exponential backoff: delay = baseDelay * 2^attempt
  },
  timeout: 5000,              // Request timeout in ms (default: 10000)
});
```

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

### OGP fallback

URLs that don't match any built-in provider are resolved via OGP meta tags automatically. Disable with `fallback: false`.

```ts
const result = await embed("https://example.com/article", { fallback: true });
// Returns link card HTML built from og:title, og:description, og:image
```

### Custom providers

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

Hooks let you intercept every `resolve()` call — useful for caching, analytics, HTML wrapping, and more. All resolution paths (`embed()`, `youtube()`, etc.) go through hooks.

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

| Method | Path      | Description                |
| ------ | --------- | -------------------------- |
| GET    | `/health` | Health check (`{ status: "ok" }`) |
| GET    | `/embed`  | Resolve a URL to embed data |

**`GET /embed` query parameters:**

| Parameter   | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `url`       | `string` | **(required)** URL to resolve        |
| `maxWidth`  | `number` | Max embed width                      |
| `maxHeight` | `number` | Max embed height                     |
| `fallback`  | `string` | Set to `"false"` to disable OGP fallback |

For Facebook/Instagram, pass the Meta access token via the `Authorization` header:

```
Authorization: Bearer APP_ID|CLIENT_TOKEN
```

#### Error responses

All error responses include a `code` field for programmatic error handling:

```json
{
  "error": "oEmbed API returned 404",
  "code": "OEMBED_FETCH_FAILED",
  "details": { "status": 404 }
}
```

| Status | Code | Description |
| ------ | ---- | ----------- |
| 400 | `VALIDATION_ERROR` | Missing or invalid `url` parameter |
| 422 | `<EmbedErrorCode>` | Resolution failed (see [Error codes](#error-codes)) |
| 422 | `UNKNOWN` | Unexpected error without a specific code |

The `details` field is included only when the underlying error has a `cause`.

#### ServerOptions

```ts
createApp({
  basePath: "/api/v1",           // prefix all routes
  defaultOptions: {              // default EmbedOptions for every request
    maxWidth: 640,
    fallback: true,
  },
});
```

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

## License

MIT
