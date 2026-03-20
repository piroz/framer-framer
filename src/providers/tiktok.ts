import { OEmbedProvider } from "./base.js";

export class TikTokProvider extends OEmbedProvider {
  name = "tiktok";
  readonly defaultAspectRatio = "9:16";
  readonly embedType = "video" as const;

  protected endpoint = "https://www.tiktok.com/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\//,
    /^https?:\/\/(www\.)?tiktok\.com\/t\//,
    /^https?:\/\/vm\.tiktok\.com\//,
  ];
}
