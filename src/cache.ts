import type { EmbedOptions, EmbedResult } from "./types.js";

/** Default maximum number of entries in the cache */
const DEFAULT_MAX_SIZE = 100;

/** Default time-to-live in milliseconds (5 minutes) */
const DEFAULT_TTL = 300_000;

/** Cache configuration */
export interface CacheOptions {
  /** Maximum number of entries (default: 100) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 300000 = 5 min) */
  ttl?: number;
}

interface CacheEntry {
  result: EmbedResult;
  expiresAt: number;
}

/**
 * Build a cache key from a URL and its resolved options.
 * Only cache-relevant options are included in the key.
 */
function buildKey(url: string, options?: EmbedOptions): string {
  if (!options) return url;
  const parts: string[] = [url];
  if (options.maxWidth != null) parts.push(`w=${options.maxWidth}`);
  if (options.maxHeight != null) parts.push(`h=${options.maxHeight}`);
  if (options.sanitize === false) parts.push("s=0");
  return parts.join("|");
}

/**
 * In-memory LRU cache for embed results.
 *
 * Uses a `Map` whose insertion order tracks recency — accessing an entry
 * moves it to the end (most-recently used), and eviction removes the first
 * entry (least-recently used).
 */
export class EmbedCache {
  private readonly map = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(options?: CacheOptions) {
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    this.ttl = options?.ttl ?? DEFAULT_TTL;
  }

  /** Look up a cached result. Returns `undefined` on miss or expiry. */
  get(url: string, options?: EmbedOptions): EmbedResult | undefined {
    const key = buildKey(url, options);
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Expired — lazy eviction
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end (most-recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.result;
  }

  /** Store a result in the cache. */
  set(url: string, options: EmbedOptions | undefined, result: EmbedResult): void {
    const key = buildKey(url, options);

    // Delete first so re-insertion moves to end
    this.map.delete(key);

    // Evict LRU entry if at capacity
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }

    this.map.set(key, { result, expiresAt: Date.now() + this.ttl });
  }

  /** Remove a specific entry from the cache. Returns `true` if the entry existed. */
  delete(url: string, options?: EmbedOptions): boolean {
    const key = buildKey(url, options);
    return this.map.delete(key);
  }

  /** Remove all entries from the cache. */
  clear(): void {
    this.map.clear();
  }

  /** Number of entries currently in the cache. */
  get size(): number {
    return this.map.size;
  }
}

/**
 * Create a new embed cache instance.
 *
 * @example
 * ```ts
 * import { createCache, embed } from 'framer-framer';
 *
 * const cache = createCache({ maxSize: 200, ttl: 60_000 });
 * const result = await embed('https://youtube.com/watch?v=abc', { cache });
 * ```
 */
export function createCache(options?: CacheOptions): EmbedCache {
  return new EmbedCache(options);
}
