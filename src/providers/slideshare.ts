import { OEmbedProvider } from "./base.js";

export class SlideShareProvider extends OEmbedProvider {
  name = "slideshare";
  readonly defaultAspectRatio = "16:9";
  readonly embedType = "rich" as const;

  protected endpoint = "https://www.slideshare.net/api/oembed/2";

  protected patterns = [/^https?:\/\/(www\.)?slideshare\.net\/[\w-]+\/[\w-]+/];
}
