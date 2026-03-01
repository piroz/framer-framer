import type { Provider } from "../types.js";
import { FacebookProvider } from "./facebook.js";
import { InstagramProvider } from "./instagram.js";
import { SoundCloudProvider } from "./soundcloud.js";
import { SpotifyProvider } from "./spotify.js";
import { TikTokProvider } from "./tiktok.js";
import { TwitterProvider } from "./twitter.js";
import { VimeoProvider } from "./vimeo.js";
import { YouTubeProvider } from "./youtube.js";

/** Singleton provider instances shared across the library */
export const youtubeProvider = new YouTubeProvider();
export const twitterProvider = new TwitterProvider();
export const tiktokProvider = new TikTokProvider();
export const facebookProvider = new FacebookProvider();
export const instagramProvider = new InstagramProvider();
export const vimeoProvider = new VimeoProvider();
export const spotifyProvider = new SpotifyProvider();
export const soundcloudProvider = new SoundCloudProvider();

/** All built-in providers */
export const builtinProviders: Provider[] = [
  youtubeProvider,
  twitterProvider,
  tiktokProvider,
  facebookProvider,
  instagramProvider,
  vimeoProvider,
  spotifyProvider,
  soundcloudProvider,
];

export {
  FacebookProvider,
  InstagramProvider,
  SoundCloudProvider,
  SpotifyProvider,
  TikTokProvider,
  TwitterProvider,
  VimeoProvider,
  YouTubeProvider,
};
export { MetaProvider } from "./meta.js";
