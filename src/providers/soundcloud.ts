import { OEmbedProvider } from "./base.js";

export class SoundCloudProvider extends OEmbedProvider {
  name = "soundcloud";
  readonly embedType = "rich" as const;

  protected endpoint = "https://soundcloud.com/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?soundcloud\.com\/(?!discover|settings|you|jobs|pages|charts|upload|logout|search|notifications|messages|stations)[\w-]+\/[\w-]+/,
  ];
}
