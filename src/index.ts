export type { EmbedOptions, EmbedResult, EmbedType, Provider } from './types.js';
export { OEmbedProvider } from './providers/base.js';
export {
  FacebookProvider,
  InstagramProvider,
  TikTokProvider,
  TwitterProvider,
  YouTubeProvider,
} from './providers/index.js';
export { registerProvider } from './resolver.js';

import type { EmbedOptions, EmbedResult } from './types.js';
import { FacebookProvider } from './providers/facebook.js';
import { InstagramProvider } from './providers/instagram.js';
import { TikTokProvider } from './providers/tiktok.js';
import { TwitterProvider } from './providers/twitter.js';
import { YouTubeProvider } from './providers/youtube.js';
import { resolve } from './resolver.js';

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
export async function embed(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return resolve(url, options);
}

// Platform-specific convenience functions

const _youtube = new YouTubeProvider();
const _twitter = new TwitterProvider();
const _tiktok = new TikTokProvider();
const _facebook = new FacebookProvider();
const _instagram = new InstagramProvider();

/** Resolve a YouTube URL */
export async function youtube(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return _youtube.resolve(url, options);
}

/** Resolve an X/Twitter URL */
export async function twitter(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return _twitter.resolve(url, options);
}

/** Resolve a TikTok URL */
export async function tiktok(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return _tiktok.resolve(url, options);
}

/** Resolve a Facebook URL (requires Meta access token) */
export async function facebook(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return _facebook.resolve(url, options);
}

/** Resolve an Instagram URL (requires Meta access token) */
export async function instagram(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  return _instagram.resolve(url, options);
}
