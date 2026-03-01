import { OEmbedProvider } from "./base.js";

export class SoundCloudProvider extends OEmbedProvider {
  name = "soundcloud";

  protected endpoint = "https://soundcloud.com/oembed";

  protected patterns = [/^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/];
}
