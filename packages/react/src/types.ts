import type { EmbedOptions, EmbedResult } from "framer-framer";
import type { ReactNode } from "react";
import type { Theme } from "./theme.js";

/** Props for the Embed component */
export interface EmbedProps {
  /** URL to embed */
  url: string;
  /** Theme mode: 'light', 'dark', or 'auto' (default: 'auto') */
  theme?: Theme;
  /** Max embed width in pixels */
  maxWidth?: number;
  /** Max embed height in pixels */
  maxHeight?: number;
  /** Options passed to the framer-framer embed() function */
  embedOptions?: EmbedOptions;
  /** Pre-fetched embed data (e.g. from a Server Component). Skips client-side fetch when provided. */
  initialData?: EmbedResult;
  /** Called when embed resolves successfully */
  onLoad?: (result: EmbedResult) => void;
  /** Called when embed resolution fails */
  onError?: (error: Error) => void;
  /** Custom loading component */
  loadingFallback?: ReactNode;
  /** Custom error component */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Additional class name for the container */
  className?: string;
  /** Additional inline styles for the container */
  style?: React.CSSProperties;
  /** Custom aria-label for the embed container (defaults to provider + title) */
  ariaLabel?: string;
}

/** State of the useEmbed hook */
export type EmbedStatus = "loading" | "success" | "error";

/** Return type of the useEmbed hook */
export interface UseEmbedReturn {
  /** Current status */
  status: EmbedStatus;
  /** Resolved embed result (available when status is 'success') */
  data: EmbedResult | null;
  /** Error (available when status is 'error') */
  error: Error | null;
  /** Default aspect ratio from the matched provider (e.g. '16:9') */
  providerAspectRatio?: string;
}
