import type { Provider } from '../types.js';
import { FacebookProvider } from './facebook.js';
import { InstagramProvider } from './instagram.js';
import { TikTokProvider } from './tiktok.js';
import { TwitterProvider } from './twitter.js';
import { YouTubeProvider } from './youtube.js';

/** Singleton provider instances shared across the library */
export const youtubeProvider = new YouTubeProvider();
export const twitterProvider = new TwitterProvider();
export const tiktokProvider = new TikTokProvider();
export const facebookProvider = new FacebookProvider();
export const instagramProvider = new InstagramProvider();

/** All built-in providers */
export const builtinProviders: Provider[] = [
  youtubeProvider,
  twitterProvider,
  tiktokProvider,
  facebookProvider,
  instagramProvider,
];

export {
  FacebookProvider,
  InstagramProvider,
  TikTokProvider,
  TwitterProvider,
  YouTubeProvider,
};
export { MetaProvider } from './meta.js';
