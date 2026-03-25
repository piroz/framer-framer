import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vimeoProvider } from "../../src/providers/index.js";

describe("VimeoProvider", () => {
  const provider = vimeoProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe src="https://player.vimeo.com/video/76979871" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>',
            title: "The New Vimeo Player",
            author_name: "Vimeo Staff",
            author_url: "https://vimeo.com/staff",
            thumbnail_url: "https://i.vimeocdn.com/video/452001751_640.jpg",
            thumbnail_width: 640,
            thumbnail_height: 360,
            width: 640,
            height: 360,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a Vimeo video URL", async () => {
    const result = await provider.resolve("https://vimeo.com/76979871");

    expect(result.provider).toBe("vimeo");
    expect(result.type).toBe("video");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("player.vimeo.com/video");
    expect(result.title).toBe("The New Vimeo Player");
    expect(result.author_name).toBe("Vimeo Staff");
    expect(result.thumbnail_url).toContain("vimeocdn.com");
    expect(result.url).toBe("https://vimeo.com/76979871");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://vimeo.com/76979871", {
      maxWidth: 640,
      maxHeight: 480,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=640");
    expect(fetchCall).toContain("maxheight=480");
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

    await expect(provider.resolve("https://vimeo.com/999999999")).rejects.toThrow(
      "vimeo oEmbed request failed: 404 Not Found",
    );
  });
});
