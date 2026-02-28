import type { EmbedOptions } from '../types.js';
import { OEmbedProvider } from './base.js';

/** Base class for Meta (Facebook/Instagram) oEmbed providers that require authentication */
export abstract class MetaProvider extends OEmbedProvider {
  protected buildOEmbedUrl(url: string, options?: EmbedOptions): string {
    const accessToken = options?.meta?.accessToken;
    if (!accessToken) {
      throw new Error(
        `${this.name} oEmbed requires a Meta access token. ` +
          'Pass it via options.meta.accessToken in "APP_ID|CLIENT_TOKEN" format.',
      );
    }

    const endpoint = this.selectEndpoint(url);

    const params = new URLSearchParams();
    params.set('url', url);
    params.set('access_token', accessToken);
    if (options?.maxWidth != null) params.set('maxwidth', String(options.maxWidth));
    if (options?.maxHeight != null) params.set('maxheight', String(options.maxHeight));

    return `${endpoint}?${params.toString()}`;
  }

  /** Select the appropriate endpoint for the given URL (override for multi-endpoint providers) */
  protected selectEndpoint(_url: string): string {
    return this.endpoint;
  }
}
