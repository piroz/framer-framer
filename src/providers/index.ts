import type { Provider } from "../types.js";
import { FacebookProvider } from "./facebook.js";
import { GradioProvider } from "./gradio.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { InstagramProvider } from "./instagram.js";
import { NiconicoProvider } from "./niconico.js";
import { NoteProvider } from "./note.js";
import { PinterestProvider } from "./pinterest.js";
import { RedditProvider } from "./reddit.js";
import { SoundCloudProvider } from "./soundcloud.js";
import { SpeakerDeckProvider } from "./speakerdeck.js";
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
export const speakerdeckProvider = new SpeakerDeckProvider();
export const pinterestProvider = new PinterestProvider();
export const redditProvider = new RedditProvider();
export const huggingfaceProvider = new HuggingFaceProvider();
export const gradioProvider = new GradioProvider();
export const niconicoProvider = new NiconicoProvider();
export const noteProvider = new NoteProvider();

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
  speakerdeckProvider,
  pinterestProvider,
  redditProvider,
  huggingfaceProvider,
  gradioProvider,
  niconicoProvider,
  noteProvider,
];

export {
  FacebookProvider,
  GradioProvider,
  HuggingFaceProvider,
  InstagramProvider,
  NiconicoProvider,
  NoteProvider,
  PinterestProvider,
  RedditProvider,
  SoundCloudProvider,
  SpeakerDeckProvider,
  SpotifyProvider,
  TikTokProvider,
  TwitterProvider,
  VimeoProvider,
  YouTubeProvider,
};
export { IframeProvider } from "./iframe-base.js";
export { MetaProvider } from "./meta.js";
