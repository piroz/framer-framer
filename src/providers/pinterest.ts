import { OEmbedProvider } from "./base.js";

export class PinterestProvider extends OEmbedProvider {
  name = "pinterest";

  protected endpoint = "https://www.pinterest.com/oembed.json";

  protected patterns = [
    /^https?:\/\/(www\.)?pinterest\.(com|jp)\/pin\//,
    /^https?:\/\/(www\.)?pinterest\.(com|jp)\/(?!pin\/|settings\/|_saved\/)[\w.-]+\/[\w.-]+\/?$/,
  ];
}
