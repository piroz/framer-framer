import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeProvider } from "../../src/providers/youtube.js";

describe("YouTubeProvider", () => {
  const provider = new YouTubeProvider();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
            title: "Rick Astley - Never Gonna Give You Up",
            author_name: "Rick Astley",
            author_url: "https://www.youtube.com/@RickAstleyYT",
            thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            thumbnail_width: 480,
            thumbnail_height: 360,
            width: 200,
            height: 113,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a YouTube video URL", async () => {
    const result = await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(result.provider).toBe("youtube");
    expect(result.type).toBe("video");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("youtube.com/embed");
    expect(result.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(result.author_name).toBe("Rick Astley");
    expect(result.thumbnail_url).toContain("ytimg.com");
    expect(result.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
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

    await expect(provider.resolve("https://www.youtube.com/watch?v=invalid")).rejects.toThrow(
      "youtube oEmbed request failed: 404 Not Found",
    );
  });
});
