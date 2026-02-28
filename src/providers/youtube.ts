import { OEmbedProvider } from './base.js';

export class YouTubeProvider extends OEmbedProvider {
  name = 'youtube';

  protected endpoint = 'https://www.youtube.com/oembed';

  protected patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?/,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
    /^https?:\/\/(www\.)?youtube\.com\/live\//,
  ];
}
