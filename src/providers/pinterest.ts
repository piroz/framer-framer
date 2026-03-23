import { OEmbedProvider } from "./base.js";

export class PinterestProvider extends OEmbedProvider {
  name = "pinterest";
  readonly embedType = "rich" as const;

  protected endpoint = "https://www.pinterest.com/oembed.json";

  protected patterns = [/^https?:\/\/(www\.)?pinterest\.(com|jp)\/pin\//];
}
