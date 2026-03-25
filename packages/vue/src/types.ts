import type { EmbedOptions, EmbedResult } from "framer-framer";

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
