/** oEmbed content type */
export type EmbedType = "rich" | "video" | "photo" | "link";

/** Result returned from embed resolution */
export interface EmbedResult {
  /** Content type */
  type: EmbedType;
  /** Embed HTML (iframe, blockquote, etc.) */
  html: string;
  /** Provider name (e.g. 'youtube', 'twitter') */
  provider: string;
  /** Content title */
  title?: string;
  /** Author name */
  author_name?: string;
  /** Author URL */
  author_url?: string;
  /** Thumbnail image URL */
  thumbnail_url?: string;
  /** Thumbnail width */
  thumbnail_width?: number;
  /** Thumbnail height */
  thumbnail_height?: number;
  /** Embed width */
  width?: number;
  /** Embed height */
  height?: number;
  /** Original URL */
  url: string;
  /** Raw oEmbed response */
  raw?: Record<string, unknown>;
}

/** Options for embed resolution */
export interface EmbedOptions {
  /** Meta (Facebook/Instagram) authentication */
  meta?: {
    /** Access token in 'APP_ID|CLIENT_TOKEN' format */
    accessToken: string;
  };
  /** Max embed width */
  maxWidth?: number;
  /** Max embed height */
  maxHeight?: number;
  /** Enable OGP fallback for unrecognized URLs (default: true) */
  fallback?: boolean;
  /** Retry configuration for transient failures (network errors, 5xx, 429) */
  retry?: {
    /** Maximum number of retries (default: 2) */
    maxRetries?: number;
    /** Base delay in milliseconds for exponential backoff (default: 500) */
    baseDelay?: number;
  };
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Enable oEmbed auto-discovery for unrecognized URLs (default: true) */
  discovery?: boolean;
  /** Sanitize HTML in oEmbed responses to prevent XSS (default: true) */
  sanitize?: boolean;
  /**
   * In-memory LRU cache for embed results.
   * Pass an `EmbedCache` instance to enable caching, or `false` to explicitly disable.
   * When omitted, no caching is performed.
   */
  cache?: import("./cache.js").EmbedCache | false;
}

/** Provider interface - implement this to add a new platform */
export interface Provider {
  /** Provider name */
  name: string;
  /** Check if this provider can handle the given URL */
  match(url: string): boolean;
  /** Resolve the URL and return embed data */
  resolve(url: string, options?: EmbedOptions): Promise<EmbedResult>;
}

/** Context passed to hooks */
export interface HookContext {
  /** The URL being resolved */
  url: string;
  /** Options passed to resolve() */
  options?: EmbedOptions;
  /** The matched provider (undefined if OGP fallback) */
  provider?: Provider;
}

/** Options for batch embed resolution */
export interface BatchEmbedOptions extends EmbedOptions {
  /** Maximum number of concurrent resolutions (default: 5) */
  concurrency?: number;
}

/**
 * Called before resolution begins.
 * - Return `void` / `undefined` to continue normally.
 * - Return an `EmbedResult` to short-circuit (skip the provider entirely).
 * - May mutate `context` to alter the URL or options for downstream processing.
 */
export type BeforeResolveHook = (
  context: HookContext,
) => undefined | EmbedResult | Promise<undefined | EmbedResult>;

/**
 * Called after resolution completes.
 * - Return `void` / `undefined` to keep the original result.
 * - Return an `EmbedResult` to replace it.
 */
export type AfterResolveHook = (
  context: HookContext,
  result: EmbedResult,
) => undefined | EmbedResult | Promise<undefined | EmbedResult>;
