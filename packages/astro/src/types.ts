import type { EmbedOptions, EmbedResult } from "framer-framer";
import type { Theme } from "./theme.js";

/** Options for getEmbed helper */
export interface GetEmbedOptions {
  /** Max embed width */
  maxWidth?: number;
  /** Max embed height */
  maxHeight?: number;
  /** Additional options passed to framer-framer's embed() */
  embedOptions?: EmbedOptions;
}

/** Options for getEmbedBatch helper */
export interface GetEmbedBatchOptions extends GetEmbedOptions {
  /** Maximum number of concurrent resolutions (default: 5) */
  concurrency?: number;
}

/** Result of getEmbed — includes the resolved data or an error */
export interface GetEmbedResult {
  /** Embed result, null if resolution failed */
  data: EmbedResult | null;
  /** Error object if resolution failed */
  error: Error | null;
}

/** Props for the Embed.astro component */
export interface EmbedProps {
  /** URL to resolve */
  url: string;
  /** Max embed width */
  maxWidth?: number;
  /** Max embed height */
  maxHeight?: number;
  /** Options passed to framer-framer's embed() */
  options?: EmbedOptions;
  /** Theme mode: 'light', 'dark', or 'auto' (default: 'auto') */
  theme?: Theme;
  /** CSS class for the container element */
  class?: string;
}
