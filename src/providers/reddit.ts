import { OEmbedProvider } from "./base.js";

export class RedditProvider extends OEmbedProvider {
  name = "reddit";
  readonly embedType = "rich" as const;

  protected endpoint = "https://www.reddit.com/oembed";

  protected patterns = [/^https?:\/\/(www\.)?reddit\.com\/r\/[\w]+\/comments\/[\w]+/];
}
