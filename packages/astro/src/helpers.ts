import type { EmbedResult } from "framer-framer";
import { embed, embedBatch } from "framer-framer";
import type { GetEmbedBatchOptions, GetEmbedOptions, GetEmbedResult } from "./types.js";

/**
 * Resolve a URL to embed data at build time.
 *
 * Designed for use in Astro component frontmatter (`---` blocks)
 * where async/await is natively supported.
 *
 * @example
 * ```astro
 * ---
 * import { getEmbed } from '@framer-framer/astro';
 * const result = await getEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * ---
 * {result.data && <div set:html={result.data.html} />}
 * ```
 */
export async function getEmbed(url: string, options?: GetEmbedOptions): Promise<GetEmbedResult> {
  try {
    const data = await embed(url, {
      ...options?.embedOptions,
      maxWidth: options?.maxWidth,
      maxHeight: options?.maxHeight,
    });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Resolve multiple URLs to embed data at build time.
 *
 * Uses framer-framer's `embedBatch()` with concurrency control.
 *
 * @example
 * ```astro
 * ---
 * import { getEmbedBatch } from '@framer-framer/astro';
 * const results = await getEmbedBatch([
 *   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 *   'https://vimeo.com/1084537',
 * ]);
 * ---
 * {results.map(r => r.data && <div set:html={r.data.html} />)}
 * ```
 */
export async function getEmbedBatch(
  urls: string[],
  options?: GetEmbedBatchOptions,
): Promise<GetEmbedResult[]> {
  const rawResults = await embedBatch(urls, {
    ...options?.embedOptions,
    maxWidth: options?.maxWidth,
    maxHeight: options?.maxHeight,
    concurrency: options?.concurrency,
  });

  return rawResults.map((result) => {
    if (result instanceof Error) {
      return { data: null, error: result };
    }
    return { data: result as EmbedResult, error: null };
  });
}
