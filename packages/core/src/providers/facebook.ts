import { MetaProvider } from "./meta.js";

export class FacebookProvider extends MetaProvider {
  name = "facebook";
  readonly embedType = "rich" as const;
  override readonly brandColor = "#1877F2";

  protected endpoint = "https://graph.facebook.com/v22.0/oembed_post";
  private videoEndpoint = "https://graph.facebook.com/v22.0/oembed_video";

  protected patterns = [
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/posts\//,
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/photos\//,
    /^https?:\/\/(www\.)?facebook\.com\/photo/,
    /^https?:\/\/(www\.)?facebook\.com\/watch\//,
    /^https?:\/\/fb\.watch\//,
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/videos\//,
    /^https?:\/\/(www\.)?facebook\.com\/share\//,
  ];

  protected selectEndpoint(url: string): string {
    return /\/(watch|videos)\/|fb\.watch/.test(url) ? this.videoEndpoint : this.endpoint;
  }
}
