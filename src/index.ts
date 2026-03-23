export type { CacheOptions } from "./cache.js";
export { createCache, EmbedCache } from "./cache.js";
export type { ExpandOptions } from "./cms/auto-expand.js";
export { expandUrls } from "./cms/auto-expand.js";
export type { ResponsiveOptions } from "./cms/responsive.js";
export { wrapResponsive } from "./cms/responsive.js";
export { discoverOEmbedUrl, resolveWithDiscovery } from "./discovery.js";
export type { EmbedErrorCode } from "./errors.js";
export { EmbedError } from "./errors.js";
export { OEmbedProvider } from "./providers/base.js";
export {
  BlueskyProvider,
  defineProvider,
  defineProviders,
  FacebookProvider,
  FlickrProvider,
  GradioProvider,
  HuggingFaceProvider,
  IframeProvider,
  InstagramProvider,
  MastodonProvider,
  MetaProvider,
  NiconicoProvider,
  NoteProvider,
  PinterestProvider,
  RedditProvider,
  SlideShareProvider,
  SoundCloudProvider,
  SpeakerDeckProvider,
  SpotifyProvider,
  TikTokProvider,
  TwitterProvider,
  VimeoProvider,
  YouTubeProvider,
} from "./providers/index.js";
export {
  canEmbed,
  clearHooks,
  getProviders,
  onAfterResolve,
  onBeforeResolve,
  registerProvider,
} from "./resolver.js";
export type {
  AfterResolveHook,
  BatchEmbedOptions,
  BeforeResolveHook,
  EmbedOptions,
  EmbedResult,
  EmbedType,
  HookContext,
  MetricsCallback,
  MetricsEvent,
  ProblemDetails,
  Provider,
  ProviderInfo,
  ProviderSchema,
  RateLimitOptions,
} from "./types.js";
export type { LogEntry, Logger, LogLevel } from "./utils/logger.js";
export { createLogger } from "./utils/logger.js";
export { clearMetrics, onMetrics } from "./utils/metrics.js";
export { sanitizeHtml } from "./utils/sanitize.js";
export { validateUrl } from "./utils/url.js";

import type { EmbedError } from "./errors.js";
import { resolve as internalResolve, resolveBatch } from "./resolver.js";
import type { BatchEmbedOptions, EmbedOptions, EmbedResult } from "./types.js";

/**
 * Resolve any URL to embed data.
 * Automatically detects the platform and uses the appropriate oEmbed API.
 * Falls back to OGP metadata for unrecognized URLs.
 *
 * @example
 * ```ts
 * const result = await embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * console.log(result.html); // <iframe ...>
 * ```
 */
export async function embed(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/**
 * Resolve any URL to embed data.
 *
 * @deprecated Use {@link embed} instead. `resolve()` will be removed in v4.0.0.
 */
export async function resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/**
 * Resolve multiple URLs to embed data in parallel.
 * Individual failures are returned as `EmbedError` instances in the result array
 * rather than throwing, so partial success is always possible.
 *
 * @example
 * ```ts
 * const results = await embedBatch([
 *   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 *   'https://x.com/user/status/123456789',
 * ]);
 * for (const r of results) {
 *   if (r instanceof EmbedError) console.error(r.code);
 *   else console.log(r.html);
 * }
 * ```
 */
export async function embedBatch(
  urls: string[],
  options?: BatchEmbedOptions,
): Promise<(EmbedResult | EmbedError)[]> {
  return resolveBatch(urls, options);
}

// Platform-specific convenience functions
// All go through the internal resolver so that registered hooks are always executed.

/** Resolve a YouTube URL */
export async function youtube(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve an X/Twitter URL */
export async function twitter(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a TikTok URL */
export async function tiktok(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Flickr URL */
export async function flickr(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Facebook URL (requires Meta access token) */
export async function facebook(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve an Instagram URL (requires Meta access token) */
export async function instagram(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Vimeo URL */
export async function vimeo(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Spotify URL */
export async function spotify(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a SlideShare URL */
export async function slideshare(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a SoundCloud URL */
export async function soundcloud(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Speaker Deck URL */
export async function speakerdeck(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Pinterest URL */
export async function pinterest(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Reddit URL */
export async function reddit(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Hugging Face Spaces URL */
export async function huggingface(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Gradio app URL */
export async function gradio(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Mastodon URL */
export async function mastodon(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Niconico URL */
export async function niconico(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a note URL */
export async function note(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}

/** Resolve a Bluesky URL */
export async function bluesky(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return internalResolve(url, options);
}
