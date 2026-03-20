import { OEmbedProvider } from "./base.js";

export class SpeakerDeckProvider extends OEmbedProvider {
  name = "speakerdeck";
  readonly defaultAspectRatio = "16:9";
  readonly embedType = "rich" as const;

  protected endpoint = "https://speakerdeck.com/oembed.json";

  protected patterns = [/^https?:\/\/(www\.)?speakerdeck\.com\/[\w-]+\/[\w-]+/];
}
