import { MetaProvider } from "./meta.js";

export class ThreadsProvider extends MetaProvider {
  name = "threads";

  protected endpoint = "https://graph.facebook.com/v22.0/threads_oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?threads\.net\/@[^/]+\/post\//,
    /^https?:\/\/(www\.)?threads\.net\/t\//,
  ];
}
