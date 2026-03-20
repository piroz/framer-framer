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
  /**
   * Authentication configuration.
   *
   * @example
   * ```ts
   * await embed(url, { auth: { meta: { accessToken: "APP_ID|CLIENT_TOKEN" } } });
   * ```
   */
  auth?: {
    /** Meta (Facebook/Instagram) authentication */
    meta?: {
      /** Access token in 'APP_ID|CLIENT_TOKEN' format */
      accessToken: string;
    };
  };
  /**
   * Meta (Facebook/Instagram) authentication.
   * @deprecated Use `auth.meta` instead. Will be removed in the next major version.
   */
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
  /**
   * Structured logger for embed resolution.
   * Pass `true` to enable the built-in JSON logger (writes to stderr),
   * a `Logger` object for custom logging, or `false`/omit to disable.
   */
  logger?: import("./utils/logger.js").Logger | boolean;
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

/** Options for rate limiting */
export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60000) */
  windowMs?: number;
  /** Maximum number of requests per window per IP (default: 100) */
  max?: number;
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
 * RFC 7807 Problem Details for HTTP APIs.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type (default: "about:blank") */
  type: string;
  /** Short human-readable summary */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail: string;
  /** Application-specific error code */
  code: string;
  /** URI reference identifying the specific occurrence */
  instance?: string;
}

/**
 * Called after resolution completes.
 * - Return `void` / `undefined` to keep the original result.
 * - Return an `EmbedResult` to replace it.
 */
export type AfterResolveHook = (
  context: HookContext,
  result: EmbedResult,
) => undefined | EmbedResult | Promise<undefined | EmbedResult>;

/** Metrics event emitted after each resolution attempt */
export interface MetricsEvent {
  /** The URL that was resolved */
  url: string;
  /** Provider name (e.g. 'youtube', 'ogp', 'discovery') */
  provider: string;
  /** Resolution time in milliseconds */
  duration: number;
  /** Whether the resolution succeeded */
  success: boolean;
  /** Whether the result was served from cache */
  cacheHit: boolean;
  /** Error code if resolution failed */
  errorCode?: string;
}

/** Callback invoked with metrics data after each resolution */
export type MetricsCallback = (event: MetricsEvent) => void;

/** Information about a registered provider */
export interface ProviderInfo {
  /** Provider name (e.g. 'youtube', 'twitter') */
  name: string;
  /** URL regex patterns this provider handles (as strings) */
  patterns: string[];
}

/** Schema for declarative provider definition */
export interface ProviderSchema {
  /** Provider name (e.g. 'dailymotion') */
  name: string;
  /** oEmbed endpoint URL */
  endpoint: string;
  /** URL patterns this provider handles (glob strings or RegExp) */
  urlPatterns: (string | RegExp)[];
  /** Optional configuration */
  options?: {
    /** Custom transform to convert raw oEmbed response to EmbedResult */
    transform?: (data: Record<string, unknown>, url: string) => EmbedResult;
  };
}
