import type { Provider } from '../types.js';
import { FacebookProvider } from './facebook.js';
import { InstagramProvider } from './instagram.js';
import { TikTokProvider } from './tiktok.js';
import { TwitterProvider } from './twitter.js';
import { YouTubeProvider } from './youtube.js';

/** All built-in providers */
export const builtinProviders: Provider[] = [
  new YouTubeProvider(),
  new TwitterProvider(),
  new TikTokProvider(),
  new FacebookProvider(),
  new InstagramProvider(),
];

export {
  FacebookProvider,
  InstagramProvider,
  TikTokProvider,
  TwitterProvider,
  YouTubeProvider,
};
