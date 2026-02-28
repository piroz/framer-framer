import type { EmbedOptions } from '../types.js';
import { OEmbedProvider } from './base.js';

export class InstagramProvider extends OEmbedProvider {
  name = 'instagram';

  protected endpoint = 'https://graph.facebook.com/v22.0/instagram_oembed';

  protected requiresAuth = true;

  protected patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/p\//,
    /^https?:\/\/(www\.)?instagram\.com\/reel\//,
    /^https?:\/\/(www\.)?instagram\.com\/tv\//,
  ];

  protected buildOEmbedUrl(url: string, options?: EmbedOptions): string {
    const accessToken = options?.meta?.accessToken;
    if (!accessToken) {
      throw new Error(
        'Instagram oEmbed requires a Meta access token. ' +
          'Pass it via options.meta.accessToken in "APP_ID|CLIENT_TOKEN" format.',
      );
    }

    const params = new URLSearchParams();
    params.set('url', url);
    params.set('access_token', accessToken);
    if (options?.maxWidth) params.set('maxwidth', String(options.maxWidth));
    if (options?.maxHeight) params.set('maxheight', String(options.maxHeight));

    return `${this.endpoint}?${params.toString()}`;
  }
}
