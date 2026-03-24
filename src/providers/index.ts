import { EmbedError } from "../errors.js";
import type { Provider } from "../types.js";
import { defineProvider } from "./declarative.js";
import { FacebookProvider } from "./facebook.js";
import { GradioProvider } from "./gradio.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { InstagramProvider } from "./instagram.js";
import { MastodonProvider } from "./mastodon.js";
import { NiconicoProvider } from "./niconico.js";

/** Pattern for the new SlideShare URL format: /slideshow/<slug>/<id> */
const SLIDESHARE_NEW_URL_PATTERN = /^https?:\/\/(www\.)?slideshare\.net\/slideshow\/[\w-]+\/\d+/;

// ---------------------------------------------------------------------------
// Declarative oEmbed providers
// ---------------------------------------------------------------------------

export const youtubeProvider = defineProvider({
  name: "youtube",
  endpoint: "https://www.youtube.com/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?/,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
    /^https?:\/\/(www\.)?youtube\.com\/live\//,
  ],
  defaultAspectRatio: "16:9",
  embedType: "video",
});

export const twitterProvider = defineProvider({
  name: "twitter",
  endpoint: "https://publish.twitter.com/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?twitter\.com\/\w+\/status\//,
    /^https?:\/\/(www\.)?x\.com\/\w+\/status\//,
  ],
  embedType: "rich",
});

export const tiktokProvider = defineProvider({
  name: "tiktok",
  endpoint: "https://www.tiktok.com/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\//,
    /^https?:\/\/(www\.)?tiktok\.com\/t\//,
    /^https?:\/\/vm\.tiktok\.com\//,
  ],
  defaultAspectRatio: "9:16",
  embedType: "video",
});

export const flickrProvider = defineProvider({
  name: "flickr",
  endpoint: "https://www.flickr.com/services/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?flickr\.com\/photos\/[\w@.-]+\/\d+/,
    /^https?:\/\/flic\.kr\/p\/\w+/,
  ],
  embedType: "photo",
});

export const vimeoProvider = defineProvider({
  name: "vimeo",
  endpoint: "https://vimeo.com/api/oembed.json",
  urlPatterns: [
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/(www\.)?vimeo\.com\/channels\/[\w-]+\/\d+/,
    /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
  ],
  defaultAspectRatio: "16:9",
  embedType: "video",
});

export const spotifyProvider = defineProvider({
  name: "spotify",
  endpoint: "https://open.spotify.com/oembed",
  urlPatterns: [/^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\//],
  embedType: "rich",
});

export const slideshareProvider = defineProvider({
  name: "slideshare",
  endpoint: "https://www.slideshare.net/api/oembed/2",
  urlPatterns: [SLIDESHARE_NEW_URL_PATTERN, /^https?:\/\/(www\.)?slideshare\.net\/[\w-]+\/[\w-]+/],
  defaultAspectRatio: "16:9",
  embedType: "rich",
  options: {
    validate(url: string) {
      if (SLIDESHARE_NEW_URL_PATTERN.test(url)) {
        throw new EmbedError(
          "OEMBED_FETCH_FAILED",
          `SlideShare's new URL format (/slideshow/slug/id) is not supported by their oEmbed API. ` +
            `Use the legacy URL format (e.g. https://www.slideshare.net/<user>/<slug>) instead.`,
        );
      }
    },
  },
});

export const soundcloudProvider = defineProvider({
  name: "soundcloud",
  endpoint: "https://soundcloud.com/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?soundcloud\.com\/(?!discover|settings|you|jobs|pages|charts|upload|logout|search|notifications|messages|stations)[\w-]+\/[\w-]+/,
  ],
  embedType: "rich",
});

export const speakerdeckProvider = defineProvider({
  name: "speakerdeck",
  endpoint: "https://speakerdeck.com/oembed.json",
  urlPatterns: [/^https?:\/\/(www\.)?speakerdeck\.com\/[\w-]+\/[\w-]+/],
  defaultAspectRatio: "16:9",
  embedType: "rich",
});

export const pinterestProvider = defineProvider({
  name: "pinterest",
  endpoint: "https://www.pinterest.com/oembed.json",
  urlPatterns: [/^https?:\/\/(www\.)?pinterest\.(com|jp)\/pin\//],
  embedType: "rich",
  options: {
    normalizeUrl(url: string) {
      return url.replace(/^(https?:\/\/(www\.)?pinterest)\.jp\//, "$1.com/");
    },
  },
});

export const redditProvider = defineProvider({
  name: "reddit",
  endpoint: "https://www.reddit.com/oembed",
  urlPatterns: [/^https?:\/\/(www\.)?reddit\.com\/r\/[\w]+\/comments\/[\w]+/],
  embedType: "rich",
});

export const blueskyProvider = defineProvider({
  name: "bluesky",
  endpoint: "https://embed.bsky.app/oembed",
  urlPatterns: [/^https?:\/\/bsky\.app\/profile\/[^/]+\/post\/[^/]+/],
});

export const noteProvider = defineProvider({
  name: "note",
  endpoint: "https://note.com/api/oembed",
  urlPatterns: [
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/n\/[\w-]+/,
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/m\/[\w-]+/,
  ],
  embedType: "rich",
});

// ---------------------------------------------------------------------------
// Class-based providers (custom logic or non-oEmbed)
// ---------------------------------------------------------------------------

export const facebookProvider = new FacebookProvider();
export const instagramProvider = new InstagramProvider();
export const huggingfaceProvider = new HuggingFaceProvider();
export const gradioProvider = new GradioProvider();
export const mastodonProvider = new MastodonProvider();
export const niconicoProvider = new NiconicoProvider();

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

export { defineProvider, defineProviders } from "./declarative.js";
export { IframeProvider } from "./iframe-base.js";
export { MetaProvider } from "./meta.js";
export {
  FacebookProvider,
  GradioProvider,
  HuggingFaceProvider,
  InstagramProvider,
  MastodonProvider,
  NiconicoProvider,
};

// ---------------------------------------------------------------------------
// Backward-compatible type aliases for migrated providers.
// These allow `import type { YouTubeProvider }` to keep working.
// ---------------------------------------------------------------------------
/** @deprecated Use `typeof youtubeProvider` or `Provider` instead. */
export type YouTubeProvider = Provider;
/** @deprecated Use `typeof twitterProvider` or `Provider` instead. */
export type TwitterProvider = Provider;
/** @deprecated Use `typeof tiktokProvider` or `Provider` instead. */
export type TikTokProvider = Provider;
/** @deprecated Use `typeof flickrProvider` or `Provider` instead. */
export type FlickrProvider = Provider;
/** @deprecated Use `typeof vimeoProvider` or `Provider` instead. */
export type VimeoProvider = Provider;
/** @deprecated Use `typeof spotifyProvider` or `Provider` instead. */
export type SpotifyProvider = Provider;
/** @deprecated Use `typeof slideshareProvider` or `Provider` instead. */
export type SlideShareProvider = Provider;
/** @deprecated Use `typeof soundcloudProvider` or `Provider` instead. */
export type SoundCloudProvider = Provider;
/** @deprecated Use `typeof speakerdeckProvider` or `Provider` instead. */
export type SpeakerDeckProvider = Provider;
/** @deprecated Use `typeof pinterestProvider` or `Provider` instead. */
export type PinterestProvider = Provider;
/** @deprecated Use `typeof redditProvider` or `Provider` instead. */
export type RedditProvider = Provider;
/** @deprecated Use `typeof blueskyProvider` or `Provider` instead. */
export type BlueskyProvider = Provider;
/** @deprecated Use `typeof noteProvider` or `Provider` instead. */
export type NoteProvider = Provider;
