import type { Provider } from "../types.js";
import { BlueskyProvider } from "./bluesky.js";
import { FacebookProvider } from "./facebook.js";
import { FlickrProvider } from "./flickr.js";
import { GradioProvider } from "./gradio.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { InstagramProvider } from "./instagram.js";
import { MastodonProvider } from "./mastodon.js";
import { NiconicoProvider } from "./niconico.js";
import { NoteProvider } from "./note.js";
import { PinterestProvider } from "./pinterest.js";
import { RedditProvider } from "./reddit.js";
import { SlideShareProvider } from "./slideshare.js";
import { SoundCloudProvider } from "./soundcloud.js";
import { SpeakerDeckProvider } from "./speakerdeck.js";
import { SpotifyProvider } from "./spotify.js";
import { TikTokProvider } from "./tiktok.js";
import { TwitterProvider } from "./twitter.js";
import { VimeoProvider } from "./vimeo.js";
import { YouTubeProvider } from "./youtube.js";

/** Singleton provider instances shared across the library */
export const blueskyProvider = new BlueskyProvider();
export const youtubeProvider = new YouTubeProvider();
export const twitterProvider = new TwitterProvider();
export const tiktokProvider = new TikTokProvider();
export const facebookProvider = new FacebookProvider();
export const flickrProvider = new FlickrProvider();
export const instagramProvider = new InstagramProvider();
export const vimeoProvider = new VimeoProvider();
export const spotifyProvider = new SpotifyProvider();
export const slideshareProvider = new SlideShareProvider();
export const soundcloudProvider = new SoundCloudProvider();
export const speakerdeckProvider = new SpeakerDeckProvider();
export const pinterestProvider = new PinterestProvider();
export const redditProvider = new RedditProvider();
export const huggingfaceProvider = new HuggingFaceProvider();
export const gradioProvider = new GradioProvider();
export const mastodonProvider = new MastodonProvider();
export const niconicoProvider = new NiconicoProvider();
export const noteProvider = new NoteProvider();

/** All built-in providers */
export const builtinProviders: Provider[] = [
  youtubeProvider,
  twitterProvider,
  tiktokProvider,
  facebookProvider,
  flickrProvider,
  instagramProvider,
  vimeoProvider,
  spotifyProvider,
  slideshareProvider,
  soundcloudProvider,
  speakerdeckProvider,
  pinterestProvider,
  redditProvider,
  huggingfaceProvider,
  gradioProvider,
  mastodonProvider,
  niconicoProvider,
  blueskyProvider,
];

export {
  BlueskyProvider,
  FacebookProvider,
  FlickrProvider,
  GradioProvider,
  HuggingFaceProvider,
  InstagramProvider,
  MastodonProvider,
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
};
export { defineProvider, defineProviders } from "./declarative.js";
export { IframeProvider } from "./iframe-base.js";
export { MetaProvider } from "./meta.js";
