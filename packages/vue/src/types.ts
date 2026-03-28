import type { EmbedOptions, EmbedResult } from "framer-framer";
import type { Theme } from "./theme.js";

/** Props for the Embed component */
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
  /** Custom aria-label for the embed container (defaults to provider + title) */
  ariaLabel?: string;
}

/** Return type of the useEmbed composable */
export interface UseEmbedReturn {
  /** Embed result, null while loading or on error */
  result: import("vue").Ref<EmbedResult | null>;
  /** Whether the embed is currently loading */
  loading: import("vue").Ref<boolean>;
  /** Error object if resolution failed */
  error: import("vue").Ref<Error | null>;
}
