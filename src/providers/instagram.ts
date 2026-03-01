import { MetaProvider } from "./meta.js";

export class InstagramProvider extends MetaProvider {
  name = "instagram";

  protected endpoint = "https://graph.facebook.com/v22.0/instagram_oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/p\//,
    /^https?:\/\/(www\.)?instagram\.com\/reel\//,
    /^https?:\/\/(www\.)?instagram\.com\/tv\//,
  ];
}
