import { OEmbedProvider } from "./base.js";

export class VimeoProvider extends OEmbedProvider {
  name = "vimeo";
  readonly defaultAspectRatio = "16:9";
  readonly embedType = "video" as const;

  protected endpoint = "https://vimeo.com/api/oembed.json";

  protected patterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/(www\.)?vimeo\.com\/channels\/[\w-]+\/\d+/,
    /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
  ];
}
