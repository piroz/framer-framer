import { EmbedError } from "../errors.js";
import type { EmbedOptions, EmbedResult } from "../types.js";
import { OEmbedProvider } from "./base.js";

/** Pattern for the new SlideShare URL format: /slideshow/<slug>/<id> */
const NEW_URL_PATTERN = /^https?:\/\/(www\.)?slideshare\.net\/slideshow\/[\w-]+\/\d+/;

export class SlideShareProvider extends OEmbedProvider {
  name = "slideshare";
  readonly defaultAspectRatio = "16:9";
  readonly embedType = "rich" as const;

  protected endpoint = "https://www.slideshare.net/api/oembed/2";

  protected patterns = [NEW_URL_PATTERN, /^https?:\/\/(www\.)?slideshare\.net\/[\w-]+\/[\w-]+/];

  async resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
    if (NEW_URL_PATTERN.test(url)) {
      throw new EmbedError(
        "OEMBED_FETCH_FAILED",
        `SlideShare's new URL format (/slideshow/slug/id) is not supported by their oEmbed API. ` +
          `Use the legacy URL format (e.g. https://www.slideshare.net/<user>/<slug>) instead.`,
      );
    }
    return super.resolve(url, options);
  }
}
