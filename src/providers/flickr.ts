import { OEmbedProvider } from "./base.js";

export class FlickrProvider extends OEmbedProvider {
  name = "flickr";
  protected endpoint = "https://www.flickr.com/services/oembed";
  protected patterns = [
    /^https?:\/\/(www\.)?flickr\.com\/photos\/[\w@.-]+\/\d+/,
    /^https?:\/\/flic\.kr\/p\/\w+/,
  ];
}
