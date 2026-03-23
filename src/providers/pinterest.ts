import type { EmbedOptions } from "../types.js";
import { OEmbedProvider } from "./base.js";

export class PinterestProvider extends OEmbedProvider {
  name = "pinterest";
  readonly embedType = "rich" as const;

  protected endpoint = "https://www.pinterest.com/oembed.json";

  protected patterns = [/^https?:\/\/(www\.)?pinterest\.(com|jp)\/pin\//];

  /** Normalize pinterest.jp URLs to pinterest.com for the oEmbed API */
  protected buildOEmbedUrl(url: string, options?: EmbedOptions): string {
    const normalizedUrl = url.replace(/^(https?:\/\/(www\.)?pinterest)\.jp\//, "$1.com/");
    return super.buildOEmbedUrl(normalizedUrl, options);
  }
}
