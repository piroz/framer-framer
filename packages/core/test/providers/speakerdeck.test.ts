import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speakerdeckProvider } from "../../src/providers/index.js";

describe("SpeakerDeckProvider", () => {
  const provider = speakerdeckProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<iframe id="talk_frame_12345" src="//speakerdeck.com/player/12345" width="710" height="399" style="border:0; padding:0; margin:0; background:transparent;" frameborder="0" allowtransparency="true" allowfullscreen="allowfullscreen"></iframe>',
            title: "My Presentation",
            author_name: "Speaker",
            author_url: "https://speakerdeck.com/speaker",
            width: 710,
            height: 399,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches Speaker Deck URLs", () => {
    expect(provider.match("https://speakerdeck.com/speaker/my-presentation")).toBe(true);
    expect(provider.match("https://www.speakerdeck.com/speaker/my-presentation")).toBe(true);
    expect(provider.match("http://speakerdeck.com/speaker/my-presentation")).toBe(true);
    expect(provider.match("https://speakerdeck.com/")).toBe(false);
    expect(provider.match("https://example.com/speakerdeck")).toBe(false);
  });

  it("resolves a Speaker Deck presentation URL", async () => {
    const result = await provider.resolve("https://speakerdeck.com/speaker/my-presentation");

    expect(result.provider).toBe("speakerdeck");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("<iframe");
    expect(result.html).toContain("speakerdeck.com/player");
    expect(result.title).toBe("My Presentation");
    expect(result.author_name).toBe("Speaker");
    expect(result.url).toBe("https://speakerdeck.com/speaker/my-presentation");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://speakerdeck.com/speaker/my-presentation", {
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

    await expect(provider.resolve("https://speakerdeck.com/speaker/nonexistent")).rejects.toThrow(
      "speakerdeck oEmbed request failed: 404 Not Found",
    );
  });
});
