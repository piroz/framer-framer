import { OEmbedProvider } from "./base.js";

export class RedditProvider extends OEmbedProvider {
  name = "reddit";

  protected endpoint = "https://www.reddit.com/oembed";

  protected patterns = [/^https?:\/\/(www\.)?reddit\.com\/r\/[\w]+\/comments\/[\w]+/];
}
