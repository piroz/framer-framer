import { OEmbedProvider } from "./base.js";

export class BlueskyProvider extends OEmbedProvider {
  name = "bluesky";

  protected endpoint = "https://embed.bsky.app/oembed";

  protected patterns = [/^https?:\/\/bsky\.app\/profile\/[^/]+\/post\/[^/]+/];
}
