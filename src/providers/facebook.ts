import type { EmbedOptions } from '../types.js';
import { OEmbedProvider } from './base.js';

export class FacebookProvider extends OEmbedProvider {
  name = 'facebook';

  protected endpoint = 'https://graph.facebook.com/v22.0/oembed_post';
  protected videoEndpoint = 'https://graph.facebook.com/v22.0/oembed_video';

  protected requiresAuth = true;

  protected patterns = [
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/posts\//,
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/photos\//,
    /^https?:\/\/(www\.)?facebook\.com\/photo/,
    /^https?:\/\/(www\.)?facebook\.com\/watch\//,
    /^https?:\/\/fb\.watch\//,
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/videos\//,
    /^https?:\/\/(www\.)?facebook\.com\/share\//,
  ];

  private isVideoUrl(url: string): boolean {
    return /\/(watch|videos)\/|fb\.watch/.test(url);
  }

  protected buildOEmbedUrl(url: string, options?: EmbedOptions): string {
    const accessToken = options?.meta?.accessToken;
    if (!accessToken) {
      throw new Error(
        'Facebook oEmbed requires a Meta access token. ' +
          'Pass it via options.meta.accessToken in "APP_ID|CLIENT_TOKEN" format.',
      );
    }

    const endpoint = this.isVideoUrl(url)
      ? this.videoEndpoint
      : this.endpoint;

    const params = new URLSearchParams();
    params.set('url', url);
    params.set('access_token', accessToken);
    if (options?.maxWidth) params.set('maxwidth', String(options.maxWidth));
    if (options?.maxHeight) params.set('maxheight', String(options.maxHeight));

    return `${endpoint}?${params.toString()}`;
  }
}
