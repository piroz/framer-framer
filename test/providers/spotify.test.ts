import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spotifyProvider } from "../../src/providers/index.js";

describe("SpotifyProvider", () => {
  const provider = spotifyProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/4PTG3Z6ehGkBFwjybzWkR8" width="100%" height="352" frameBorder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>',
            title: "Never Gonna Give You Up",
            thumbnail_url: "https://i.scdn.co/image/ab67616d00001e02cdb645498cd3d8a2db4c9b1e",
            thumbnail_width: 300,
            thumbnail_height: 300,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a Spotify track URL", async () => {
    const result = await provider.resolve("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8");

    expect(result.provider).toBe("spotify");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("open.spotify.com/embed");
    expect(result.title).toBe("Never Gonna Give You Up");
    expect(result.thumbnail_url).toContain("scdn.co");
    expect(result.url).toBe("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8", {
      maxWidth: 400,
      maxHeight: 300,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=400");
    expect(fetchCall).toContain("maxheight=300");
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(provider.resolve("https://open.spotify.com/track/invalid")).rejects.toThrow(
      "spotify oEmbed request failed: 404 Not Found",
    );
  });
});
