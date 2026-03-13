import { OEmbedProvider } from "./base.js";

export class SpeakerDeckProvider extends OEmbedProvider {
  name = "speakerdeck";

  protected endpoint = "https://speakerdeck.com/oembed.json";

  protected patterns = [/^https?:\/\/(www\.)?speakerdeck\.com\/[\w-]+\/[\w-]+/];
}
