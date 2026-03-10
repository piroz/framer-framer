import { IframeProvider } from "./iframe-base.js";

/**
 * v0.dev provider (Vercel).
 *
 * Embeds AI-generated UI components from v0.dev.
 *
 * URL patterns:
 *   - https://v0.dev/t/{id}
 *   - https://v0.dev/chat/{id}
 *
 * Embed URL:
 *   - https://v0.dev/t/{id}.embed (for /t/ URLs)
 */
export class V0Provider extends IframeProvider {
  name = "v0";

  protected defaultWidth = 800;
  protected defaultHeight = 500;

  /** Captures: [1] full base URL, [2] path type (t|chat), [3] id */
  private static readonly URL_RE = /^(https?:\/\/v0\.dev\/(t|chat)\/([\w-]+))/;

  protected patterns = [V0Provider.URL_RE];

  protected buildEmbedUrl(url: string): string | null {
    const match = V0Provider.URL_RE.exec(url);
    if (!match) return null;

    const [, baseUrl, pathType] = match;
    // /t/{id} has an embed variant; /chat/{id} is used as-is
    return pathType === "t" ? `${baseUrl}.embed` : baseUrl;
  }

  protected extractTitle(url: string): string | undefined {
    const match = V0Provider.URL_RE.exec(url);
    if (!match) return undefined;
    return `v0.dev — ${match[3]}`;
  }
}
