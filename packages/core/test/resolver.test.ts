import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbedError } from "../src/errors.js";
import { canEmbed, findProvider, getProviderInfo, getProviders, resolve } from "../src/resolver.js";

describe("findProvider - URL auto-detection", () => {
  // YouTube
  const youtubeUrls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/abc123",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/live/abc123",
  ];

  for (const url of youtubeUrls) {
    it(`detects YouTube: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("youtube");
    });
  }

  // X/Twitter
  const twitterUrls = [
    "https://twitter.com/jack/status/20",
    "https://www.twitter.com/user/status/123456",
    "https://x.com/elonmusk/status/123456789",
    "https://www.x.com/user/status/999",
  ];

  for (const url of twitterUrls) {
    it(`detects Twitter: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("twitter");
    });
  }

  // TikTok
  const tiktokUrls = [
    "https://www.tiktok.com/@user/video/1234567890",
    "https://tiktok.com/@user.name/video/1234567890",
    "https://www.tiktok.com/t/ZTRabcdef/",
    "https://vm.tiktok.com/ZTRabcdef/",
  ];

  for (const url of tiktokUrls) {
    it(`detects TikTok: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("tiktok");
    });
  }

  // Facebook
  const facebookUrls = [
    "https://www.facebook.com/user/posts/123456",
    "https://facebook.com/user/posts/123456",
    "https://www.facebook.com/watch/123456",
    "https://fb.watch/abc123/",
    "https://www.facebook.com/user/videos/123456",
    "https://www.facebook.com/share/abc123/",
  ];

  for (const url of facebookUrls) {
    it(`detects Facebook: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("facebook");
    });
  }

  // Instagram
  const instagramUrls = [
    "https://www.instagram.com/p/abc123/",
    "https://instagram.com/p/abc123/",
    "https://www.instagram.com/reel/abc123/",
    "https://www.instagram.com/tv/abc123/",
  ];

  for (const url of instagramUrls) {
    it(`detects Instagram: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("instagram");
    });
  }

  // Vimeo
  const vimeoUrls = [
    "https://vimeo.com/76979871",
    "https://www.vimeo.com/76979871",
    "https://vimeo.com/channels/staffpicks/76979871",
    "https://player.vimeo.com/video/76979871",
  ];

  for (const url of vimeoUrls) {
    it(`detects Vimeo: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("vimeo");
    });
  }

  // Spotify
  const spotifyUrls = [
    "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
    "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
    "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    "https://open.spotify.com/episode/512ojhOuo1ktJprKbVcKyQ",
    "https://open.spotify.com/show/2MAi0BvDc6GTFvKFPXnkCL",
  ];

  for (const url of spotifyUrls) {
    it(`detects Spotify: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("spotify");
    });
  }

  // SoundCloud
  const soundcloudUrls = [
    "https://soundcloud.com/munchimusic/bbkkbkk",
    "https://www.soundcloud.com/artist-name/track-name",
  ];

  for (const url of soundcloudUrls) {
    it(`detects SoundCloud: ${url}`, () => {
      expect(findProvider(url)?.name).toBe("soundcloud");
    });
  }

  // SoundCloud negative cases (non-content pages should not match)
  const soundcloudNonContentUrls = [
    "https://soundcloud.com/discover/sets",
    "https://soundcloud.com/settings/account",
    "https://soundcloud.com/you/likes",
    "https://soundcloud.com/upload/new",
    "https://soundcloud.com/charts/top",
  ];

  for (const url of soundcloudNonContentUrls) {
    it(`does not detect SoundCloud for non-content URL: ${url}`, () => {
      expect(findProvider(url)?.name).not.toBe("soundcloud");
    });
  }

  // Unknown URLs
  it("returns undefined for unknown URLs", () => {
    expect(findProvider("https://example.com")).toBeUndefined();
    expect(findProvider("https://github.com/piroz/repo")).toBeUndefined();
  });
});

describe("resolve - URL validation integration", () => {
  it("throws VALIDATION_ERROR for private IP addresses", async () => {
    await expect(resolve("http://127.0.0.1")).rejects.toThrow(EmbedError);
    try {
      await resolve("http://127.0.0.1");
    } catch (err) {
      expect((err as EmbedError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("throws VALIDATION_ERROR for localhost", async () => {
    await expect(resolve("http://localhost")).rejects.toThrow(EmbedError);
    try {
      await resolve("http://localhost");
    } catch (err) {
      expect((err as EmbedError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("throws VALIDATION_ERROR for unsupported protocol", async () => {
    await expect(resolve("ftp://example.com")).rejects.toThrow(EmbedError);
    try {
      await resolve("ftp://example.com");
    } catch (err) {
      expect((err as EmbedError).code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("resolve - oEmbed discovery integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const discoveryHtml = `
    <html><head>
      <link rel="alternate" type="application/json+oembed"
            href="https://unknown-site.com/oembed?url=https://unknown-site.com/post/1&format=json" />
    </head><body></body></html>
  `;

  const oembedResponse = {
    type: "rich",
    html: '<iframe src="https://unknown-site.com/embed/1"></iframe>',
    provider_name: "UnknownSite",
    title: "A Post",
  };

  it("uses discovery for unrecognized URLs before OGP fallback", async () => {
    const fetchMock = vi.fn();
    // Discovery: fetch HTML page
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(discoveryHtml),
    });
    // Discovery: fetch oEmbed endpoint
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(oembedResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolve("https://unknown-site.com/post/1");

    expect(result.provider).toBe("UnknownSite");
    expect(result.title).toBe("A Post");
    expect(result.html).toContain("iframe");
    // OGP fallback should NOT be called
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to OGP when discovery finds no oEmbed link", async () => {
    const plainHtml = `
      <html><head>
        <meta property="og:title" content="OGP Title" />
        <meta property="og:description" content="OGP Description" />
        <meta property="og:site_name" content="PlainSite" />
      </head><body></body></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(plainHtml),
      }),
    );

    const result = await resolve("https://plain-site.com/page");

    expect(result.provider).toBe("PlainSite");
    expect(result.type).toBe("link");
    expect(result.html).toContain("framer-framer-card");
  });

  it("skips discovery when discovery option is false", async () => {
    const plainHtml = `
      <html><head>
        <link rel="alternate" type="application/json+oembed"
              href="https://site.com/oembed?url=https://site.com/post" />
        <meta property="og:title" content="OGP Title" />
        <meta property="og:site_name" content="SiteWithBoth" />
      </head><body></body></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(plainHtml),
      }),
    );

    const result = await resolve("https://site.com/post", { discovery: false });

    // Should use OGP fallback, not discovery
    expect(result.provider).toBe("SiteWithBoth");
    expect(result.type).toBe("link");
    expect(result.html).toContain("framer-framer-card");
  });
});

describe("getProviders", () => {
  it("returns all built-in providers with name and patterns", () => {
    const providers = getProviders();
    expect(providers.length).toBeGreaterThanOrEqual(18);
    const names = providers.map((p) => p.name);
    expect(names).toContain("youtube");
    expect(names).toContain("twitter");
    expect(names).toContain("tiktok");
    expect(names).toContain("niconico");
    expect(names).toContain("threads");
    expect(names).not.toContain("note");
  });

  it("returns patterns as regex source strings", () => {
    const providers = getProviders();
    const youtube = providers.find((p) => p.name === "youtube");
    expect(youtube).toBeDefined();
    expect(youtube?.patterns.length).toBeGreaterThan(0);
    // Patterns should be regex source strings, not full /pattern/ with slashes
    for (const pattern of youtube?.patterns ?? []) {
      expect(pattern).not.toMatch(/^\//);
    }
  });

  it("returns metadata fields for providers", () => {
    const providers = getProviders();
    const youtube = providers.find((p) => p.name === "youtube");
    expect(youtube?.defaultAspectRatio).toBe("16:9");
    expect(youtube?.embedType).toBe("video");
    expect(youtube?.supportsMaxWidth).toBe(true);
  });

  it("returns embedType for all built-in providers", () => {
    const providers = getProviders();
    const builtinNames = [
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
      "niconico",
    ];
    for (const name of builtinNames) {
      const provider = providers.find((p) => p.name === name);
      expect(provider?.embedType, `${name} should have embedType`).toBeDefined();
    }
  });

  it("returns supportsMaxWidth=true for oEmbed providers and false for iframe providers", () => {
    const providers = getProviders();
    // oEmbed-based providers support maxWidth
    expect(providers.find((p) => p.name === "youtube")?.supportsMaxWidth).toBe(true);
    expect(providers.find((p) => p.name === "vimeo")?.supportsMaxWidth).toBe(true);
    // iframe-based providers do not support maxWidth
    expect(providers.find((p) => p.name === "huggingface")?.supportsMaxWidth).toBe(false);
    expect(providers.find((p) => p.name === "gradio")?.supportsMaxWidth).toBe(false);
  });

  it("returns defaultAspectRatio for video providers", () => {
    const providers = getProviders();
    const videoProviders = ["youtube", "vimeo", "niconico"];
    for (const name of videoProviders) {
      const provider = providers.find((p) => p.name === name);
      expect(provider?.defaultAspectRatio, `${name} should have defaultAspectRatio`).toBe("16:9");
    }
  });
});

describe("canEmbed", () => {
  it("returns true for a URL matching a built-in provider", () => {
    expect(canEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(canEmbed("https://x.com/user/status/123456789")).toBe(true);
    expect(canEmbed("https://vimeo.com/76979871")).toBe(true);
  });

  it("returns false for an unknown URL", () => {
    expect(canEmbed("https://example.com/page")).toBe(false);
    expect(canEmbed("https://github.com/piroz/repo")).toBe(false);
  });
});

describe("getProviderInfo", () => {
  it("returns provider info with defaultAspectRatio for YouTube", () => {
    const info = getProviderInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(info).toBeDefined();
    expect(info?.name).toBe("youtube");
    expect(info?.defaultAspectRatio).toBe("16:9");
  });

  it("returns provider info for TikTok with 9:16 aspect ratio", () => {
    const info = getProviderInfo("https://www.tiktok.com/@user/video/1234567890");
    expect(info).toBeDefined();
    expect(info?.name).toBe("tiktok");
    expect(info?.defaultAspectRatio).toBe("9:16");
  });

  it("returns undefined for unknown URL", () => {
    const info = getProviderInfo("https://example.com/page");
    expect(info).toBeUndefined();
  });
});
