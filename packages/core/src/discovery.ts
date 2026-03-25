import { DEFAULT_TIMEOUT_MS } from "./constants.js";
import { EmbedError } from "./errors.js";
import type { EmbedOptions, EmbedResult } from "./types.js";
import { withRetry } from "./utils/retry.js";
import { sanitizeHtml } from "./utils/sanitize.js";

/**
 * Regex to extract oEmbed discovery `<link>` tags from HTML.
 *
 * Matches `<link>` elements with:
 * - `rel="alternate"` (or `rel='alternate'`)
 * - `type="application/json+oembed"` (JSON format only; XML is ignored)
 * - `href="<url>"` — the oEmbed endpoint URL
 *
 * Attribute order does not matter.
 */
const OEMBED_LINK_RE =
  /<link\b[^>]*\btype=["']application\/json\+oembed["'][^>]*\bhref=["']([^"']+)["'][^>]*\/?>|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\btype=["']application\/json\+oembed["'][^>]*\/?>/i;

/**
 * Fetch the HTML page at `url` and look for an oEmbed discovery `<link>` tag.
 * Returns the oEmbed endpoint URL if found, or `undefined`.
 */
export async function discoverOEmbedUrl(
  url: string,
  options?: EmbedOptions,
): Promise<string | undefined> {
  const html = await withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "framer-framer/1.0 (oEmbed discovery)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new EmbedError(
        "OGP_FETCH_FAILED",
        `Discovery: failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  }, options?.retry);

  const match = OEMBED_LINK_RE.exec(html);
  const href = match?.[1] ?? match?.[2];
  // HTML attributes may contain HTML entities (e.g. &amp; → &)
  return href?.replaceAll("&amp;", "&") ?? undefined;
}

/**
 * Attempt oEmbed auto-discovery for a URL.
 *
 * 1. Fetch the page HTML
 * 2. Look for `<link rel="alternate" type="application/json+oembed" href="...">`
 * 3. Fetch the oEmbed endpoint and return an `EmbedResult`
 *
 * Returns `undefined` if no oEmbed link is found.
 * Throws on network / parse errors.
 */
export async function resolveWithDiscovery(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult | undefined> {
  const oembedUrl = await discoverOEmbedUrl(url, options);
  if (!oembedUrl) return undefined;

  const data = await withRetry(async () => {
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new EmbedError(
        "OEMBED_FETCH_FAILED",
        `Discovery oEmbed request failed: ${response.status} ${response.statusText}`,
      );
    }

    try {
      return (await response.json()) as Record<string, unknown>;
    } catch (cause) {
      throw new EmbedError("OEMBED_PARSE_ERROR", "Discovery oEmbed response is not valid JSON", {
        cause,
      });
    }
  }, options?.retry);

  const result: EmbedResult = {
    type: (data.type as EmbedResult["type"]) ?? "rich",
    html: (data.html as string) ?? "",
    provider: (data.provider_name as string) ?? new URL(url).hostname,
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

  if (options?.sanitize !== false) {
    result.html = sanitizeHtml(result.html);
  }

  return result;
}
