import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { soundcloudProvider } from "../../src/providers/index.js";

describe("SoundCloudProvider", () => {
  const provider = soundcloudProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<iframe width="100%" height="400" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293&show_artwork=true"></iframe>',
            title: "Munchi - B.B.K.K.B.K.K.",
            author_name: "Munchi",
            author_url: "https://soundcloud.com/munchimusic",
            thumbnail_url: "https://i1.sndcdn.com/artworks-000024913592-uv2xcu-t500x500.jpg",
            width: 640,
            height: 400,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a SoundCloud track URL", async () => {
    const result = await provider.resolve("https://soundcloud.com/munchimusic/bbkkbkk");

    expect(result.provider).toBe("soundcloud");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("w.soundcloud.com/player");
    expect(result.title).toBe("Munchi - B.B.K.K.B.K.K.");
    expect(result.author_name).toBe("Munchi");
    expect(result.thumbnail_url).toContain("sndcdn.com");
    expect(result.url).toBe("https://soundcloud.com/munchimusic/bbkkbkk");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://soundcloud.com/munchimusic/bbkkbkk", {
      maxWidth: 500,
      maxHeight: 300,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=500");
    expect(fetchCall).toContain("maxheight=300");
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }),
    );

    await expect(provider.resolve("https://soundcloud.com/user/private-track")).rejects.toThrow(
      "soundcloud oEmbed request failed: 403 Forbidden",
    );
  });
});
