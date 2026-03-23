import { describe, expect, it } from "vitest";
import { BlueskyProvider } from "../../src/providers/bluesky.js";
import { FacebookProvider } from "../../src/providers/facebook.js";
import { FlickrProvider } from "../../src/providers/flickr.js";
import { GradioProvider } from "../../src/providers/gradio.js";
import { HuggingFaceProvider } from "../../src/providers/huggingface.js";
import { builtinProviders } from "../../src/providers/index.js";
import { InstagramProvider } from "../../src/providers/instagram.js";
import { MastodonProvider } from "../../src/providers/mastodon.js";
import { NiconicoProvider } from "../../src/providers/niconico.js";
import { PinterestProvider } from "../../src/providers/pinterest.js";
import { RedditProvider } from "../../src/providers/reddit.js";
import { SlideShareProvider } from "../../src/providers/slideshare.js";
import { SoundCloudProvider } from "../../src/providers/soundcloud.js";
import { SpeakerDeckProvider } from "../../src/providers/speakerdeck.js";
import { SpotifyProvider } from "../../src/providers/spotify.js";
import { TikTokProvider } from "../../src/providers/tiktok.js";
import { TwitterProvider } from "../../src/providers/twitter.js";
import { VimeoProvider } from "../../src/providers/vimeo.js";
import { YouTubeProvider } from "../../src/providers/youtube.js";

/**
 * Provider status validation tests.
 *
 * Verifies that all built-in providers are correctly configured:
 * - URL patterns match expected service URLs
 * - URL patterns reject unrelated URLs
 * - Provider metadata (name, embedType, aspectRatio) is set
 * - All expected providers are registered in builtinProviders
 *
 * Actual oEmbed endpoint connectivity is verified via CLI (`/verify-cli`).
 */
describe("Provider status validation", () => {
  describe("builtinProviders registration", () => {
    const expectedProviders = [
      "youtube",
      "twitter",
      "tiktok",
      "facebook",
      "flickr",
      "instagram",
      "vimeo",
      "spotify",
      "slideshare",
      "soundcloud",
      "speakerdeck",
      "pinterest",
      "reddit",
      "huggingface",
      "gradio",
      "mastodon",
      "niconico",
      "bluesky",
    ];

    it("registers all 18 expected providers", () => {
      expect(builtinProviders).toHaveLength(18);
    });

    it.each(expectedProviders)("includes %s provider", (name) => {
      const found = builtinProviders.find((p) => p.name === name);
      expect(found).toBeDefined();
    });

    it("does not include deprecated note provider", () => {
      const found = builtinProviders.find((p) => p.name === "note");
      expect(found).toBeUndefined();
    });
  });

  describe("YouTube", () => {
    const provider = new YouTubeProvider();

    it.each([
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/abc123",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.youtube.com/channel/UCabc",
      "https://www.youtube.com/playlist?list=PLabc",
      "https://www.youtube.com/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Twitter/X", () => {
    const provider = new TwitterProvider();

    it.each([
      "https://twitter.com/user/status/123456789",
      "https://www.twitter.com/user/status/123456789",
      "https://x.com/user/status/123456789",
      "https://www.x.com/user/status/123456789",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://twitter.com/user",
      "https://x.com/user/likes",
      "https://twitter.com/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("TikTok", () => {
    const provider = new TikTokProvider();

    it.each([
      "https://www.tiktok.com/@user/video/1234567890",
      "https://tiktok.com/@user.name/video/1234567890",
      "https://www.tiktok.com/t/ZT8abc/",
      "https://vm.tiktok.com/ZT8abc/",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.tiktok.com/@user",
      "https://www.tiktok.com/discover",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Facebook", () => {
    const provider = new FacebookProvider();

    it.each([
      "https://www.facebook.com/user/posts/123456",
      "https://facebook.com/user/photos/123456",
      "https://www.facebook.com/photo?fbid=123",
      "https://www.facebook.com/watch/?v=123",
      "https://fb.watch/abc123/",
      "https://www.facebook.com/user/videos/123456",
      "https://www.facebook.com/share/p/abc123/",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.facebook.com/",
      "https://www.facebook.com/user",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Flickr", () => {
    const provider = new FlickrProvider();

    it.each([
      "https://www.flickr.com/photos/user/12345678901",
      "https://flickr.com/photos/12345678@N00/12345678901",
      "https://flic.kr/p/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.flickr.com/people/user",
      "https://www.flickr.com/groups/group",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Instagram", () => {
    const provider = new InstagramProvider();

    it.each([
      "https://www.instagram.com/p/abc123/",
      "https://instagram.com/reel/abc123/",
      "https://www.instagram.com/tv/abc123/",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.instagram.com/user",
      "https://www.instagram.com/stories/user/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Vimeo", () => {
    const provider = new VimeoProvider();

    it.each([
      "https://vimeo.com/123456789",
      "https://www.vimeo.com/123456789",
      "https://vimeo.com/channels/staffpicks/123456789",
      "https://player.vimeo.com/video/123456789",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://vimeo.com/user12345",
      "https://vimeo.com/channels/staffpicks",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Spotify", () => {
    const provider = new SpotifyProvider();

    it.each([
      "https://open.spotify.com/track/abc123",
      "https://open.spotify.com/album/abc123",
      "https://open.spotify.com/playlist/abc123",
      "https://open.spotify.com/episode/abc123",
      "https://open.spotify.com/show/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://open.spotify.com/user/abc123",
      "https://open.spotify.com/artist/abc123",
      "https://spotify.com/track/abc123",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("SlideShare", () => {
    const provider = new SlideShareProvider();

    it.each([
      "https://www.slideshare.net/user/presentation-name",
      "https://slideshare.net/user/presentation-name",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.slideshare.net/user",
      "https://www.slideshare.net/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("SoundCloud", () => {
    const provider = new SoundCloudProvider();

    it.each([
      "https://soundcloud.com/artist/track-name",
      "https://www.soundcloud.com/artist/track-name",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://soundcloud.com/discover",
      "https://soundcloud.com/settings",
      "https://soundcloud.com/upload",
      "https://soundcloud.com/charts",
    ])("does not match %s (reserved path)", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Speaker Deck", () => {
    const provider = new SpeakerDeckProvider();

    it.each([
      "https://speakerdeck.com/user/presentation-name",
      "https://www.speakerdeck.com/user/presentation-name",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://speakerdeck.com/user",
      "https://speakerdeck.com/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Pinterest", () => {
    const provider = new PinterestProvider();

    it.each([
      "https://www.pinterest.com/pin/123456789/",
      "https://pinterest.com/pin/123456789/",
      "https://www.pinterest.jp/pin/123456789/",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.pinterest.com/",
      "https://www.pinterest.com/settings/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Reddit", () => {
    const provider = new RedditProvider();

    it.each([
      "https://www.reddit.com/r/subreddit/comments/abc123/post_title",
      "https://reddit.com/r/subreddit/comments/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.reddit.com/r/subreddit",
      "https://www.reddit.com/u/username",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Hugging Face", () => {
    const provider = new HuggingFaceProvider();

    it.each(["https://huggingface.co/spaces/owner/space-name"])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://huggingface.co/models/owner/model",
      "https://huggingface.co/owner/model",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Gradio", () => {
    const provider = new GradioProvider();

    it.each([
      "https://user-space.hf.space",
      "https://user-space.hf.space/",
      "https://abcdef123456.gradio.live",
      "https://abcdef123456.gradio.live/",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://huggingface.co/spaces/owner/space",
      "https://example.com/",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Mastodon", () => {
    const provider = new MastodonProvider();

    it.each([
      "https://mastodon.social/@user/123456789",
      "https://mstdn.jp/@user/123456789",
      "https://pawoo.net/@user/123456789",
      "https://fosstodon.org/@user/123456789",
      "https://unknown-instance.example/@user/123456789",
      "https://mastodon.social/users/user/statuses/123456789",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://mastodon.social/@user",
      "https://mastodon.social/@user/followers",
      "https://mastodon.social/about",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Niconico", () => {
    const provider = new NiconicoProvider();

    it.each([
      "https://www.nicovideo.jp/watch/sm12345678",
      "https://nicovideo.jp/watch/sm12345678",
      "https://nico.ms/sm12345678",
      "https://live.nicovideo.jp/watch/lv12345678",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://www.nicovideo.jp/watch/1234567",
      "https://www.nicovideo.jp/mylist/12345678",
      "https://nico.ms/lv12345678",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("Bluesky", () => {
    const provider = new BlueskyProvider();

    it.each([
      "https://bsky.app/profile/user.bsky.social/post/abc123",
      "https://bsky.app/profile/custom.domain/post/abc123",
    ])("matches %s", (url) => {
      expect(provider.match(url)).toBe(true);
    });

    it.each([
      "https://bsky.app/profile/user.bsky.social",
      "https://bsky.app/profile/user.bsky.social/likes",
    ])("does not match %s", (url) => {
      expect(provider.match(url)).toBe(false);
    });
  });

  describe("provider metadata", () => {
    const providers = [
      { cls: YouTubeProvider, name: "youtube", embedType: "video", aspectRatio: "16:9" },
      { cls: TwitterProvider, name: "twitter", embedType: "rich", aspectRatio: undefined },
      { cls: TikTokProvider, name: "tiktok", embedType: "video", aspectRatio: "9:16" },
      { cls: FacebookProvider, name: "facebook", embedType: "rich", aspectRatio: undefined },
      { cls: FlickrProvider, name: "flickr", embedType: "photo", aspectRatio: undefined },
      { cls: InstagramProvider, name: "instagram", embedType: "rich", aspectRatio: "1:1" },
      { cls: VimeoProvider, name: "vimeo", embedType: "video", aspectRatio: "16:9" },
      { cls: SpotifyProvider, name: "spotify", embedType: "rich", aspectRatio: undefined },
      { cls: SlideShareProvider, name: "slideshare", embedType: "rich", aspectRatio: "16:9" },
      { cls: SoundCloudProvider, name: "soundcloud", embedType: "rich", aspectRatio: undefined },
      { cls: SpeakerDeckProvider, name: "speakerdeck", embedType: "rich", aspectRatio: "16:9" },
      { cls: PinterestProvider, name: "pinterest", embedType: "rich", aspectRatio: undefined },
      { cls: RedditProvider, name: "reddit", embedType: "rich", aspectRatio: undefined },
      { cls: HuggingFaceProvider, name: "huggingface", embedType: "rich", aspectRatio: "4:3" },
      { cls: GradioProvider, name: "gradio", embedType: "rich", aspectRatio: "4:3" },
      { cls: MastodonProvider, name: "mastodon", embedType: undefined, aspectRatio: undefined },
      { cls: NiconicoProvider, name: "niconico", embedType: "video", aspectRatio: "16:9" },
      { cls: BlueskyProvider, name: "bluesky", embedType: undefined, aspectRatio: undefined },
    ];

    it.each(providers)("$name has correct metadata", ({ cls, name, embedType, aspectRatio }) => {
      const provider = new cls();
      expect(provider.name).toBe(name);

      const p = provider as { embedType?: string; defaultAspectRatio?: string };
      if (embedType !== undefined) {
        expect(p.embedType).toBe(embedType);
      }
      if (aspectRatio !== undefined) {
        expect(p.defaultAspectRatio).toBe(aspectRatio);
      }
    });
  });
});
