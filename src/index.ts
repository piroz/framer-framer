export { OEmbedProvider } from "./providers/base.js";
export {
  FacebookProvider,
  InstagramProvider,
  MetaProvider,
  TikTokProvider,
  TwitterProvider,
  YouTubeProvider,
} from "./providers/index.js";
export { registerProvider } from "./resolver.js";
export type { EmbedOptions, EmbedResult, EmbedType, Provider } from "./types.js";

import {
  facebookProvider,
  instagramProvider,
  tiktokProvider,
  twitterProvider,
  youtubeProvider,
} from "./providers/index.js";
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

/** Resolve a YouTube URL */
export async function youtube(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return youtubeProvider.resolve(url, options);
}

/** Resolve an X/Twitter URL */
export async function twitter(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return twitterProvider.resolve(url, options);
}

/** Resolve a TikTok URL */
export async function tiktok(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return tiktokProvider.resolve(url, options);
}

/** Resolve a Facebook URL (requires Meta access token) */
export async function facebook(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return facebookProvider.resolve(url, options);
}

/** Resolve an Instagram URL (requires Meta access token) */
export async function instagram(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  return instagramProvider.resolve(url, options);
}
