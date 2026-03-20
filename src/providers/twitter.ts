import { OEmbedProvider } from "./base.js";

export class TwitterProvider extends OEmbedProvider {
  name = "twitter";
  readonly embedType = "rich" as const;

  protected endpoint = "https://publish.twitter.com/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?twitter\.com\/\w+\/status\//,
    /^https?:\/\/(www\.)?x\.com\/\w+\/status\//,
  ];
}
