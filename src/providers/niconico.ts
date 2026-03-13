import { OEmbedProvider } from "./base.js";

export class NiconicoProvider extends OEmbedProvider {
  name = "niconico";

  protected endpoint = "https://embed.nicovideo.jp/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?nicovideo\.jp\/watch\/sm\w+/,
    /^https?:\/\/nico\.ms\/sm\w+/,
    /^https?:\/\/live\.nicovideo\.jp\/watch\/lv\w+/,
  ];
}
