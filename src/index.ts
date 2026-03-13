export type { CacheOptions } from "./cache.js";
export { createCache, EmbedCache } from "./cache.js";
export { discoverOEmbedUrl, resolveWithDiscovery } from "./discovery.js";
export type { EmbedErrorCode } from "./errors.js";
export { EmbedError } from "./errors.js";
export { OEmbedProvider } from "./providers/base.js";
export {
  FacebookProvider,
  GradioProvider,
  HuggingFaceProvider,
  IframeProvider,
  InstagramProvider,
  MetaProvider,
  NoteProvider,
  PinterestProvider,
  SoundCloudProvider,
  SpotifyProvider,
  TikTokProvider,
  TwitterProvider,
  VimeoProvider,
  YouTubeProvider,
} from "./providers/index.js";
export { clearHooks, onAfterResolve, onBeforeResolve, registerProvider } from "./resolver.js";
export type {
  AfterResolveHook,
  BeforeResolveHook,
  EmbedOptions,
  EmbedResult,
  EmbedType,
  HookContext,
  Provider,
} from "./types.js";
export { sanitizeHtml } from "./utils/sanitize.js";
export { validateUrl } from "./utils/url.js";

import { resolve } from "./resolver.js";
import type { EmbedOptions, EmbedResult } from "./types.js";

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
  return resolve(url, options);
}

// Platform-specific convenience functions
// All go through resolve() so that registered hooks are always executed.

/** Resolve a YouTube URL */
export async function youtube(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve an X/Twitter URL */
export async function twitter(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a TikTok URL */
export async function tiktok(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Facebook URL (requires Meta access token) */
export async function facebook(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve an Instagram URL (requires Meta access token) */
export async function instagram(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Vimeo URL */
export async function vimeo(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Spotify URL */
export async function spotify(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a SoundCloud URL */
export async function soundcloud(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Pinterest URL */
export async function pinterest(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Hugging Face Spaces URL */
export async function huggingface(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a Gradio app URL */
export async function gradio(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}

/** Resolve a note URL */
export async function note(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return resolve(url, options);
}
