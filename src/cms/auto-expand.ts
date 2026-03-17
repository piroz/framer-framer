import { resolve } from "../resolver.js";
import type { EmbedOptions } from "../types.js";

/** Options for URL auto-expansion */
export interface ExpandOptions extends EmbedOptions {
  /**
   * Input format: "text" treats input as plain text / Markdown,
   * "html" treats input as HTML.
   * @default "text"
   */
  format?: "text" | "html";
  /**
   * Maximum number of concurrent URL resolutions.
   * @default 5
   */
  concurrency?: number;
  /**
   * URL patterns to exclude from expansion (matched against each detected URL).
   * Each entry can be a string (exact prefix match) or a RegExp.
   */
  exclude?: (string | RegExp)[];
}

/**
 * Regular expression to detect standalone URLs in plain text / Markdown.
 *
 * Matches `http://` and `https://` URLs that are NOT inside:
 * - Markdown link syntax: `[text](url)`
 * - Markdown image syntax: `![alt](url)`
 *
 * The negative lookbehind `(?<!\]\()` prevents matching URLs preceded by `](`.
 */
const STANDALONE_URL_RE = /(?<!\]\()https?:\/\/[^\s<>[\]"')`]+/g;

/** Default concurrency for URL expansion */
const DEFAULT_EXPAND_CONCURRENCY = 5;

/**
 * Detect standalone URLs in text that should be expanded.
 * Skips URLs inside Markdown link/image syntax.
 */
function detectTextUrls(text: string): string[] {
  // Collect positions of URLs inside Markdown links [text](url) and ![alt](url)
  const markdownLinkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  const markdownUrlPositions = new Set<string>();
  for (const mdMatch of text.matchAll(markdownLinkRe)) {
    markdownUrlPositions.add(`${mdMatch.index + mdMatch[0].indexOf(mdMatch[1])}:${mdMatch[1]}`);
  }

  const urls: string[] = [];
  const seen = new Set<string>();

  // Reset lastIndex for global regex
  STANDALONE_URL_RE.lastIndex = 0;
  for (const match of text.matchAll(STANDALONE_URL_RE)) {
    const url = cleanTrailingPunctuation(match[0]);
    const posKey = `${match.index}:${match[0]}`;

    // Skip if this URL is part of a Markdown link
    if (markdownUrlPositions.has(posKey)) continue;

    // Deduplicate
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

/**
 * Remove trailing punctuation that is unlikely to be part of the URL.
 * Handles common cases like URLs followed by periods, commas, or parentheses.
 */
function cleanTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/, "");
}

/** Check if a URL matches any exclude pattern */
function isExcluded(url: string, exclude?: (string | RegExp)[]): boolean {
  if (!exclude || exclude.length === 0) return false;
  return exclude.some((pattern) =>
    typeof pattern === "string" ? url.startsWith(pattern) : pattern.test(url),
  );
}

/**
 * Expand standalone URLs in text or HTML to embed HTML.
 *
 * Detects URLs in the input, resolves each to embed HTML via `resolve()`,
 * and replaces them inline. URLs that fail to resolve are left unchanged.
 *
 * In `"text"` mode (default), Markdown link syntax `[text](url)` and
 * image syntax `![alt](url)` are preserved — only standalone URLs are expanded.
 *
 * In `"html"` mode, URLs inside `<a href="...">` and other HTML attributes
 * are preserved — only bare URLs in text content are expanded.
 *
 * @example
 * ```ts
 * const text = 'Check this: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
 * const expanded = await expandUrls(text);
 * // 'Check this: <iframe ...></iframe>'
 * ```
 */
export async function expandUrls(text: string, options?: ExpandOptions): Promise<string> {
  if (!text) return text;

  const {
    format = "text",
    concurrency = DEFAULT_EXPAND_CONCURRENCY,
    exclude,
    ...embedOptions
  } = options ?? {};

  // Detect URLs based on format
  const urls = format === "html" ? detectHtmlBareUrls(text) : detectTextUrls(text);

  // Filter out excluded URLs
  const targetUrls = urls.filter((url) => !isExcluded(url, exclude));

  if (targetUrls.length === 0) return text;

  // Resolve all URLs with concurrency control
  const resolvedMap = await resolveUrls(targetUrls, embedOptions, concurrency);

  // Replace URLs in text with embed HTML
  let result = text;
  for (const [url, html] of resolvedMap) {
    result = result.replaceAll(url, html);
  }

  return result;
}

/**
 * Detect bare URLs in HTML content that are NOT inside tag attributes.
 * URLs inside href, src, and other attributes are skipped.
 */
function detectHtmlBareUrls(html: string): string[] {
  // Collect positions of all HTML tags
  const tagRe = /<[^>]+>/g;
  const tagPositions: Array<{ start: number; end: number }> = [];
  for (const tagMatch of html.matchAll(tagRe)) {
    tagPositions.push({
      start: tagMatch.index,
      end: tagMatch.index + tagMatch[0].length,
    });
  }

  // Find standalone URLs not inside any tag
  const urls: string[] = [];
  const seen = new Set<string>();
  STANDALONE_URL_RE.lastIndex = 0;
  for (const match of html.matchAll(STANDALONE_URL_RE)) {
    const pos = match.index;
    const insideTag = tagPositions.some((t) => pos >= t.start && pos < t.end);
    if (insideTag) continue;

    const url = cleanTrailingPunctuation(match[0]);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

/**
 * Resolve a list of URLs concurrently, returning a map of URL → embed HTML.
 * Failed resolutions are silently omitted (original URL is kept).
 */
async function resolveUrls(
  urls: string[],
  options: EmbedOptions,
  concurrency: number,
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < urls.length) {
      const i = nextIndex++;
      const url = urls[i];
      try {
        const result = await resolve(url, options);
        resolved.set(url, result.html);
      } catch {
        // On failure, leave the URL unchanged (do not add to map)
      }
    }
  }

  const workerCount = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return resolved;
}
