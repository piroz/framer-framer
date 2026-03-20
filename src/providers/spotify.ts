import { OEmbedProvider } from "./base.js";

export class SpotifyProvider extends OEmbedProvider {
  name = "spotify";
  readonly embedType = "rich" as const;

  protected endpoint = "https://open.spotify.com/oembed";

  protected patterns = [/^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\//];
}
