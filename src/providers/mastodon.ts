import { resolveWithDiscovery } from "../discovery.js";
import { EmbedError } from "../errors.js";
import type { EmbedOptions, EmbedResult } from "../types.js";
import { OEmbedProvider } from "./base.js";

/** Known Mastodon instances with their oEmbed endpoints */
const KNOWN_INSTANCES: Record<string, string> = {
  "mastodon.social": "https://mastodon.social/api/oembed",
  "mstdn.jp": "https://mstdn.jp/api/oembed",
  "pawoo.net": "https://pawoo.net/api/oembed",
  "mastodon.online": "https://mastodon.online/api/oembed",
  "mas.to": "https://mas.to/api/oembed",
  "fosstodon.org": "https://fosstodon.org/api/oembed",
};

export class MastodonProvider extends OEmbedProvider {
  name = "mastodon";

  protected endpoint = "";

  protected patterns = [
    /^https?:\/\/[^/]+\/@[^/]+\/\d+$/,
    /^https?:\/\/[^/]+\/users\/[^/]+\/statuses\/\d+$/,
  ];

  async resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
    const hostname = new URL(url).hostname;
    const knownEndpoint = KNOWN_INSTANCES[hostname];

    if (knownEndpoint) {
      this.endpoint = knownEndpoint;
      return super.resolve(url, options);
    }

    // Unknown instance: use oEmbed discovery
    const result = await resolveWithDiscovery(url, options);
    if (!result) {
      throw new EmbedError(
        "OEMBED_FETCH_FAILED",
        `mastodon oEmbed discovery failed for ${hostname}: no oEmbed link found`,
      );
    }

    result.provider = this.name;
    return result;
  }
}
