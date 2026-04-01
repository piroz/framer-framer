import type { CacheAdapter } from "../cache.js";
import type { EmbedResult } from "../types.js";

/** Default key prefix to avoid collisions with other apps in the same KV namespace */
const DEFAULT_KEY_PREFIX = "framer:";

/** Default time-to-live in seconds (5 minutes) */
const DEFAULT_TTL = 300;

/**
 * Minimal KVNamespace interface used by CloudflareKVCacheAdapter.
 *
 * This covers only the subset of methods required, so consumers do not need
 * to install `@cloudflare/workers-types` — the real `KVNamespace` binding
 * provided by the Workers runtime satisfies this interface.
 */
export interface KVNamespaceLike {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

/** Options for {@link CloudflareKVCacheAdapter} */
export interface CloudflareKVCacheOptions {
  /** Cloudflare Workers KV namespace binding */
  namespace: KVNamespaceLike;
  /** Key prefix to avoid collisions (default: `"framer:"`) */
  keyPrefix?: string;
  /** Default time-to-live in seconds (default: `300`) */
  defaultTtl?: number;
}

/**
 * Cache adapter backed by Cloudflare Workers KV.
 *
 * Stores embed results as JSON strings in a KV namespace with automatic TTL
 * expiration handled by the KV platform.
 *
 * @example
 * ```ts
 * import { embed, CloudflareKVCacheAdapter } from 'framer-framer';
 *
 * export default {
 *   async fetch(request, env) {
 *     const cache = new CloudflareKVCacheAdapter({ namespace: env.EMBED_KV });
 *     const result = await embed('https://youtube.com/watch?v=abc', { cache });
 *     return Response.json(result);
 *   },
 * };
 * ```
 */
export class CloudflareKVCacheAdapter implements CacheAdapter {
  private readonly ns: KVNamespaceLike;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;

  constructor(options: CloudflareKVCacheOptions) {
    this.ns = options.namespace;
    this.keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.defaultTtl = options.defaultTtl ?? DEFAULT_TTL;
  }

  async get(key: string): Promise<EmbedResult | undefined> {
    const raw = await this.ns.get(this.keyPrefix + key, "text");
    if (raw === null) return undefined;
    return JSON.parse(raw) as EmbedResult;
  }

  async set(key: string, value: EmbedResult, ttl?: number): Promise<void> {
    const expirationTtl = ttl ?? this.defaultTtl;
    await this.ns.put(this.keyPrefix + key, JSON.stringify(value), {
      expirationTtl,
    });
  }

  async delete(key: string): Promise<boolean> {
    const existing = await this.ns.get(this.keyPrefix + key, "text");
    await this.ns.delete(this.keyPrefix + key);
    return existing !== null;
  }

  async clear(): Promise<void> {
    let cursor: string | undefined;
    do {
      const result = await this.ns.list({
        prefix: this.keyPrefix,
        cursor,
        limit: 1000,
      });
      await Promise.all(result.keys.map((k) => this.ns.delete(k.name)));
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);
  }
}
