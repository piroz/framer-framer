import { IframeProvider } from "./iframe-base.js";

/**
 * Niconico (ニコニコ動画) provider.
 *
 * Uses iframe embedding via `embed.nicovideo.jp` since the oEmbed
 * endpoint (`embed.nicovideo.jp/oembed`) was discontinued.
 *
 * URL patterns:
 *   - https://www.nicovideo.jp/watch/sm*
 *   - https://nico.ms/sm*
 *   - https://live.nicovideo.jp/watch/lv*
 *
 * Embed URL:
 *   - https://embed.nicovideo.jp/watch/{id}
 */
export class NiconicoProvider extends IframeProvider {
  name = "niconico";
  readonly defaultAspectRatio = "16:9";
  readonly embedType = "video" as const;

  protected defaultWidth = 640;
  protected defaultHeight = 360;

  /** Matches video/live ID from Niconico URLs */
  private static readonly NICOVIDEO_RE = /^https?:\/\/(www\.)?nicovideo\.jp\/watch\/(sm\w+)/;
  private static readonly NICOMS_RE = /^https?:\/\/nico\.ms\/(sm\w+)/;
  private static readonly NICOLIVE_RE = /^https?:\/\/live\.nicovideo\.jp\/watch\/(lv\w+)/;

  protected patterns = [
    NiconicoProvider.NICOVIDEO_RE,
    NiconicoProvider.NICOMS_RE,
    NiconicoProvider.NICOLIVE_RE,
  ];

  protected buildEmbedUrl(url: string): string | null {
    const id = this.extractVideoId(url);
    if (!id) return null;
    return `https://embed.nicovideo.jp/watch/${id}`;
  }

  protected extractTitle(url: string): string | undefined {
    const id = this.extractVideoId(url);
    return id ? `Niconico ${id}` : undefined;
  }

  private extractVideoId(url: string): string | null {
    for (const re of [
      NiconicoProvider.NICOVIDEO_RE,
      NiconicoProvider.NICOMS_RE,
      NiconicoProvider.NICOLIVE_RE,
    ]) {
      const match = re.exec(url);
      if (match) {
        // NICOVIDEO_RE captures id in group 2, others in group 1
        return re === NiconicoProvider.NICOVIDEO_RE ? (match[2] ?? null) : (match[1] ?? null);
      }
    }
    return null;
  }
}
