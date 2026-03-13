import { OEmbedProvider } from "./base.js";

export class SlideShareProvider extends OEmbedProvider {
  name = "slideshare";

  protected endpoint = "https://www.slideshare.net/api/oembed/2";

  protected patterns = [/^https?:\/\/(www\.)?slideshare\.net\/[\w-]+\/[\w-]+/];
}
