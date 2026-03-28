import { DEFAULT_TIMEOUT_MS } from "../constants.js";
import { EmbedError } from "../errors.js";
import type { EmbedOptions, EmbedResult, EmbedType, Provider } from "../types.js";
import { withRetry } from "../utils/retry.js";
import { sanitizeHtml } from "../utils/sanitize.js";

/** Base class for oEmbed-based providers */
export abstract class OEmbedProvider implements Provider {
  abstract name: string;

  /** URL patterns this provider handles */
  protected abstract patterns: RegExp[];

  /** oEmbed endpoint URL */
  protected abstract endpoint: string;

  /** Default aspect ratio hint (e.g. '16:9', '1:1') */
  readonly defaultAspectRatio?: string;

  /** oEmbed content type hint */
  readonly embedType?: EmbedType;

  /** Whether this provider supports the maxWidth parameter (default: true for oEmbed providers) */
  readonly supportsMaxWidth: boolean = true;

  /** Provider brand color in hex format (e.g. '#FF0000') */
  readonly brandColor?: string;

  match(url: string): boolean {
    return this.patterns.some((pattern) => pattern.test(url));
  }

  async resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
    const oembedUrl = this.buildOEmbedUrl(url, options);
    const providerName = this.name;

    const data = await withRetry(async () => {
      const response = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new EmbedError(
          "OEMBED_FETCH_FAILED",
          `${providerName} oEmbed request failed: ${response.status} ${response.statusText}`,
        );
      }

      try {
        return (await response.json()) as Record<string, unknown>;
      } catch (cause) {
        throw new EmbedError(
          "OEMBED_PARSE_ERROR",
          `${providerName} oEmbed response is not valid JSON`,
          { cause },
        );
      }
    }, options?.retry);

    const result = this.toEmbedResult(url, data);
    if (options?.sanitize !== false) {
      result.html = sanitizeHtml(result.html);
    }
    return result;
  }

  /** Build the oEmbed API URL with query parameters */
  protected buildOEmbedUrl(url: string, options?: EmbedOptions): string {
    const params = new URLSearchParams();
    params.set("url", url);
    params.set("format", "json");
    if (options?.maxWidth != null) params.set("maxwidth", String(options.maxWidth));
    if (options?.maxHeight != null) params.set("maxheight", String(options.maxHeight));

    return `${this.endpoint}?${params.toString()}`;
  }

  /** Convert raw oEmbed response to EmbedResult */
  protected toEmbedResult(url: string, data: Record<string, unknown>): EmbedResult {
    return {
      type: (data.type as EmbedResult["type"]) ?? "rich",
      html: (data.html as string) ?? "",
      provider: this.name,
      title: data.title as string | undefined,
      author_name: data.author_name as string | undefined,
      author_url: data.author_url as string | undefined,
      thumbnail_url: data.thumbnail_url as string | undefined,
      thumbnail_width: data.thumbnail_width as number | undefined,
      thumbnail_height: data.thumbnail_height as number | undefined,
      width: data.width as number | undefined,
      height: data.height as number | undefined,
      url,
      raw: data,
    };
  }
}
