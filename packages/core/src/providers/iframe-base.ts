import { EmbedError } from "../errors.js";
import type { EmbedOptions, EmbedResult, EmbedType, Provider } from "../types.js";
import { escapeHtml } from "../utils/html.js";

/**
 * Base class for providers that generate iframes directly from URL patterns
 * (i.e. platforms without oEmbed API support).
 *
 * Subclasses must implement:
 * - `name` — provider identifier
 * - `patterns` — URL regexes to match
 * - `buildEmbedUrl(url)` — convert the original URL into an embeddable URL
 */
export abstract class IframeProvider implements Provider {
  abstract name: string;

  /** URL patterns this provider handles */
  protected abstract patterns: RegExp[];

  /** Default aspect ratio hint (e.g. '16:9', '1:1') */
  readonly defaultAspectRatio?: string;

  /** oEmbed content type hint */
  readonly embedType?: EmbedType;

  /** Whether this provider supports the maxWidth parameter (default: false for iframe providers) */
  readonly supportsMaxWidth: boolean = false;

  /** Provider brand color in hex format (e.g. '#FF0000') */
  readonly brandColor?: string;

  /** Default iframe width */
  protected defaultWidth = 800;

  /** Default iframe height */
  protected defaultHeight = 450;

  /**
   * Sandbox flags applied to the generated iframe.
   *
   * **Security note:** The combination of `allow-same-origin` and `allow-scripts`
   * allows a **same-origin** iframe to remove its own sandbox via
   * `document.querySelector('iframe').removeAttribute('sandbox')`.
   * All current subclasses embed **cross-origin** content, so this escape is
   * not possible. If you add a same-origin provider, override this property
   * to omit `allow-same-origin`.
   */
  protected sandboxFlags: string[] = [
    "allow-forms",
    "allow-popups",
    "allow-same-origin",
    "allow-scripts",
  ];

  /** Referrer policy applied to the generated iframe. */
  protected referrerPolicy = "no-referrer";

  match(url: string): boolean {
    return this.patterns.some((pattern) => pattern.test(url));
  }

  /**
   * Convert the original page URL into an embeddable iframe `src` URL.
   * Return `null` if the URL cannot be converted (should not happen if
   * `match()` returned `true`).
   */
  protected abstract buildEmbedUrl(url: string): string | null;

  /** Extract a human-readable title from the URL (best-effort) */
  // biome-ignore lint/correctness/noUnusedFunctionParameters: overridden by subclasses
  protected extractTitle(url: string): string | undefined {
    return undefined;
  }

  async resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
    const embedUrl = this.buildEmbedUrl(url);
    if (!embedUrl) {
      throw new EmbedError(
        "VALIDATION_ERROR",
        `${this.name}: failed to build embed URL from ${url}`,
      );
    }
    return this.buildResult(url, embedUrl, options);
  }

  protected buildResult(
    originalUrl: string,
    embedUrl: string,
    options?: EmbedOptions,
  ): EmbedResult {
    const width = options?.maxWidth ?? this.defaultWidth;
    const height = options?.maxHeight ?? this.defaultHeight;
    const title = this.extractTitle(originalUrl) ?? "";

    const safeEmbedUrl = escapeHtml(embedUrl);
    const safeTitle = escapeHtml(title);

    const safeSandbox = escapeHtml(this.sandboxFlags.join(" "));
    const safeReferrerPolicy = escapeHtml(this.referrerPolicy);

    const ariaLabel = title ? `${this.name}: ${title}` : this.name;
    const safeAriaLabel = escapeHtml(ariaLabel);

    const html =
      `<iframe src="${safeEmbedUrl}" width="${width}" height="${height}" ` +
      `frameborder="0" allow="encrypted-media" ` +
      `allowfullscreen sandbox="${safeSandbox}" ` +
      `referrerpolicy="${safeReferrerPolicy}" ` +
      `title="${safeTitle}" aria-label="${safeAriaLabel}" tabindex="0"></iframe>`;

    return {
      type: "rich",
      html,
      provider: this.name,
      title: title || undefined,
      width,
      height,
      url: originalUrl,
    };
  }
}
