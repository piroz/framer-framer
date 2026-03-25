import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tiktokProvider } from "../../src/providers/index.js";

describe("TikTokProvider", () => {
  const provider = tiktokProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "video",
            html: '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/123"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>',
            title: "Fun video #fyp",
            author_name: "user",
            author_url: "https://www.tiktok.com/@user",
            thumbnail_url: "https://p16-sign.tiktokcdn.com/thumb.jpg",
            thumbnail_width: 576,
            thumbnail_height: 1024,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a TikTok video URL", async () => {
    const result = await provider.resolve("https://www.tiktok.com/@user/video/1234567890");

    expect(result.provider).toBe("tiktok");
    expect(result.type).toBe("video");
    expect(result.html).toContain("tiktok-embed");
    expect(result.author_name).toBe("user");
  });
});
