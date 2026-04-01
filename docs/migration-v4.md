# Migration Guide: Upgrading to framer-framer v4.0.0

This guide covers the migration steps for upgrading from v3.x to v4.0.0.

v4.0.0 introduces Edge runtime support (Cloudflare Workers, Deno, Bun) and a pluggable adapter architecture. As part of this, several deprecated APIs have been removed.

## Breaking Changes Summary

| Change | Impact | Action Required |
|--------|--------|-----------------|
| `EmbedCache` class removed | Cache API changed | Replace with `MemoryCacheAdapter` |
| `createCache()` removed | Cache factory changed | Use `new MemoryCacheAdapter()` |
| `resolve()` removed | Deprecated API deleted | Replace with `embed()` |
| `EmbedOptions.meta` removed | Auth config changed | Use `auth.meta.accessToken` |
| `cache` option type narrowed | Type constraint | `EmbedCache` no longer accepted |

## Step 1: Replace `EmbedCache` with `MemoryCacheAdapter`

The `EmbedCache` class and `createCache()` factory have been removed. Use `MemoryCacheAdapter` instead, which provides the same in-memory LRU caching behavior.

### Before (v3.x)

```ts
import { embed, EmbedCache } from "framer-framer";

const cache = new EmbedCache({ maxSize: 200, ttl: 60_000 });
const result = await embed(url, { cache });
```

or using the factory function:

```ts
import { embed, createCache } from "framer-framer";

const cache = createCache({ maxSize: 200, ttl: 60_000 });
const result = await embed(url, { cache });
```

### After (v4.x)

```ts
import { embed, MemoryCacheAdapter } from "framer-framer";

const cache = new MemoryCacheAdapter({ maxSize: 200, ttl: 60_000 });
const result = await embed(url, { cache });
```

The constructor options (`maxSize`, `ttl`) and behavior (LRU eviction, lazy TTL expiry) are identical.

### Custom cache implementations

If you implemented a custom cache by extending `EmbedCache`, migrate to implementing the `CacheAdapter` interface directly:

```ts
// Before (v3.x) — extending EmbedCache
import { EmbedCache } from "framer-framer";

class MyCache extends EmbedCache {
  async get(key: string) {
    // custom logic
    return super.get(key);
  }
}

// After (v4.x) — implementing CacheAdapter
import type { CacheAdapter } from "framer-framer";
import type { EmbedResult } from "framer-framer";

class MyCache implements CacheAdapter {
  async get(key: string): Promise<EmbedResult | undefined> {
    // your implementation
  }
  async set(key: string, value: EmbedResult, ttl?: number): Promise<void> {
    // your implementation
  }
  async delete(key: string): Promise<boolean> {
    // your implementation
  }
  async clear(): Promise<void> {
    // your implementation
  }
}
```

The `CacheAdapter` interface is unchanged from v3.x. If you already implemented `CacheAdapter` directly, no changes are needed.

## Step 2: Replace `resolve()` with `embed()`

The `resolve()` function has been removed. Use `embed()`, which is functionally identical.

### Before (v3.x)

```ts
import { resolve } from "framer-framer";

const result = await resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
```

### After (v4.x)

```ts
import { embed } from "framer-framer";

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
```

This is a direct find-and-replace: `resolve(` → `embed(` and update the import.

## Step 3: Update Meta Authentication Options

The deprecated `meta` option at the top level has been removed. Use the `auth.meta` namespace.

### Before (v3.x)

```ts
const result = await embed(url, {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
```

### After (v4.x)

```ts
const result = await embed(url, {
  auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } },
});
```

If you were already using `auth.meta.accessToken`, no changes are needed.

## Step 4: Update `cache` Option Types

The `cache` option type has been narrowed from `CacheAdapter | EmbedCache | false` to `CacheAdapter | false`. Since `EmbedCache` has been removed, any code passing an `EmbedCache` instance should be updated as described in [Step 1](#step-1-replace-embedcache-with-memorycacheadapter).

If you are using TypeScript, the compiler will catch any type mismatches after upgrading.

## New Features in v4.0.0

These are additive and require no migration, but may be useful:

### UrlValidator Interface

v4.0.0 introduces a pluggable URL validation system for runtime-appropriate SSRF protection:

```ts
import { embed, DnsUrlValidator } from "framer-framer";

// DNS-resolving validator (Node.js) — resolves hostnames and blocks private IPs
const result = await embed(url, {
  urlValidator: new DnsUrlValidator(),
});
```

The built-in `StringUrlValidator` (string-based, Edge-compatible) is used by default, matching v3.x behavior.

### Redis Cache Adapter

For production deployments, `RedisCacheAdapter` provides persistent caching via Redis:

```ts
import { embed, RedisCacheAdapter } from "framer-framer";
import Redis from "ioredis";

const cache = new RedisCacheAdapter({
  client: new Redis(),
  keyPrefix: "framer:",
  defaultTtl: 300,
});

const result = await embed(url, { cache });
```

### Cloudflare KV Cache Adapter

For Cloudflare Workers deployments:

```ts
import { embed, CloudflareKVCacheAdapter } from "framer-framer";

const cache = new CloudflareKVCacheAdapter({
  namespace: env.EMBED_CACHE,  // KV namespace binding
  keyPrefix: "framer:",
  defaultTtl: 300,
});

const result = await embed(url, { cache });
```

### OpenTelemetry Integration

v4.0.0 provides helper utilities to bridge the existing `onMetrics()` hook with OpenTelemetry:

```ts
import { onMetrics } from "framer-framer";
import { metrics, trace } from "@opentelemetry/api";

const meter = metrics.getMeter("framer-framer");
const histogram = meter.createHistogram("embed.duration", { unit: "ms" });
const counter = meter.createCounter("embed.requests");

onMetrics((event) => {
  counter.add(1, {
    provider: event.provider,
    success: String(event.success),
  });
  histogram.record(event.duration, {
    provider: event.provider,
  });
});
```

## Quick Reference

```ts
// v3.x
import { resolve, EmbedCache, createCache } from "framer-framer";

const cache = createCache({ maxSize: 100, ttl: 60_000 });
const result = await resolve(url, {
  meta: { accessToken: token },
  cache,
});

// v4.x
import { embed, MemoryCacheAdapter } from "framer-framer";

const cache = new MemoryCacheAdapter({ maxSize: 100, ttl: 60_000 });
const result = await embed(url, {
  auth: { meta: { accessToken: token } },
  cache,
});
```
