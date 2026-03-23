# Migration Guide: Upgrading to framer-framer v3.0.0

This guide covers the migration steps for upgrading from v1.x or v2.x to v3.0.0.

## Breaking Changes Summary

| Change | Impact | Action Required |
|--------|--------|-----------------|
| `resolve()` → `embed()` | Primary API renamed | Update function calls |
| `meta.accessToken` → `auth.meta.accessToken` | Auth config restructured | Update option objects |
| Node.js ≥ 22 required | Minimum runtime version | Update Node.js |
| `sanitize` defaults to `true` | HTML output may differ | Review embed HTML handling |

## Node.js Version

v3.0.0 requires **Node.js 22 or later**.

```bash
node -v
# Must be v22.0.0 or higher
```

If you are on an older version, upgrade Node.js before updating framer-framer.

## Step 1: Replace `resolve()` with `embed()`

The `resolve()` function has been deprecated in favor of `embed()`. Both functions are identical in behavior, but `resolve()` will be removed in the next major version.

### Before (v1.x / v2.x)

```ts
import { resolve } from "framer-framer";

const result = await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
```

### After (v3.x)

```ts
import { embed } from "framer-framer";

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
```

> **Note:** `resolve()` still works in v3.x but emits a deprecation notice. Update at your earliest convenience.

## Step 2: Update Meta Authentication Options

The authentication namespace for Facebook/Instagram has been restructured. The `meta` option at the top level is now nested under `auth.meta`.

### Before (v1.x / v2.x)

```ts
const result = await resolve(url, {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
```

### After (v3.x)

```ts
const result = await embed(url, {
  auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
});
```

> **Note:** The old `meta.accessToken` path still works in v3.x for backward compatibility but is deprecated. Both paths may be used simultaneously — `auth.meta.accessToken` takes precedence.

## Step 3: Review HTML Sanitization Behavior

Starting in v2.1.0, HTML sanitization was introduced with `sanitize` defaulting to `true`. If you were on v1.x and relied on raw oEmbed HTML output, this change may affect your application.

### What Gets Sanitized

- Tags not in the allowlist are removed (allowed: `iframe`, `blockquote`, `img`, `a`, `p`, `div`, `span`, `script`, `br`, `strong`, `em`)
- `script` tags are only kept if their `src` points to trusted domains (e.g., `platform.twitter.com`, `cdn.embedly.com`, `www.tiktok.com`)
- Event handler attributes (`onclick`, `onerror`, etc.) are stripped
- `javascript:` and `data:` URIs in `src`/`href` are blocked

### If You Need Raw HTML

```ts
const result = await embed(url, { sanitize: false });
```

> **Note:** Disabling sanitization is **not recommended** unless you have your own sanitization pipeline.

## Migration from v1.x

If upgrading directly from v1.x to v3.x, the following additional changes from v2.x also apply:

### HTML Sanitization (v2.1.0)

Sanitization is enabled by default. See [Step 3](#step-3-review-html-sanitization-behavior) above.

### LRU Cache (v2.1.0)

An optional built-in LRU cache is available. No action required — caching is opt-in:

```ts
import { embed, createCache } from "framer-framer";

const cache = createCache({ max: 100, ttl: 60_000 });
const result = await embed(url, { cache });
```

### oEmbed Auto-Discovery (v2.1.0)

Auto-discovery is enabled by default (`discovery: true`). For URLs without a registered provider, framer-framer now attempts to discover oEmbed endpoints from the page's HTML before falling back to OGP metadata. Disable with:

```ts
const result = await embed(url, { discovery: false });
```

### Batch Processing (v2.3.0)

`embedBatch()` resolves multiple URLs in parallel with configurable concurrency:

```ts
import { embedBatch } from "framer-framer";

const results = await embedBatch([
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://x.com/user/status/123456789",
], { concurrency: 3 });
```

### Structured Errors (v1.4.0)

Errors are now instances of `EmbedError` with a `code` property:

```ts
import { embed, EmbedError } from "framer-framer";

try {
  await embed(url);
} catch (err) {
  if (err instanceof EmbedError) {
    console.error(err.code);  // e.g., "PROVIDER_NOT_FOUND", "TIMEOUT"
    console.error(err.cause); // original error, if any
  }
}
```

## New Features in v3.0.0

These are additive and require no migration, but may be useful:

### URL Auto-Expansion

```ts
import { expandUrls } from "framer-framer";

const html = await expandUrls(
  "Check this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
);
// "Check this video: <iframe ...></iframe>"
```

### Responsive Wrapper

```ts
import { wrapResponsive } from "framer-framer";

const responsive = wrapResponsive(result.html, {
  width: 640,
  height: 360,
});
```

### Provider Query API

```ts
import { getProviders, canEmbed } from "framer-framer";

const providers = getProviders();
// [{ name: "youtube", patterns: [...] }, ...]

canEmbed("https://www.youtube.com/watch?v=abc"); // true
canEmbed("https://example.com");                  // false
```

## Quick Reference

```ts
// v1.x / v2.x
import { resolve } from "framer-framer";
const result = await resolve(url, {
  meta: { accessToken: token },
});

// v3.x
import { embed } from "framer-framer";
const result = await embed(url, {
  auth: { meta: { accessToken: token } },
});
```
