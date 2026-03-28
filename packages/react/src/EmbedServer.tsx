import type { EmbedOptions, EmbedResult } from "framer-framer";
import { embed } from "framer-framer";
import type { CSSProperties, ReactNode } from "react";
import { ErrorState } from "./ErrorState.js";
import type { Theme } from "./theme.js";
import { themeCSS, themeStyleId } from "./theme.js";

/** Props for the EmbedServer component (React Server Component) */
export interface EmbedServerProps {
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
  /** Custom error component */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Additional class name for the container */
  className?: string;
  /** Additional inline styles for the container */
  style?: CSSProperties;
}

/**
 * Async Server Component for embedding URLs.
 * Fetches embed data on the server — no client-side JavaScript required.
 *
 * @example
 * ```tsx
 * // app/page.tsx (Next.js App Router)
 * import { EmbedServer } from '@framer-framer/react/server';
 *
 * export default async function Page() {
 *   return <EmbedServer url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />;
 * }
 * ```
 */
export async function EmbedServer({
  url,
  maxWidth,
  maxHeight,
  embedOptions,
  errorFallback,
  className,
  style,
  theme = "auto",
}: EmbedServerProps) {
  const containerStyle: CSSProperties = {
    ...(maxWidth ? { maxWidth } : {}),
    ...(maxHeight ? { maxHeight, overflow: "hidden" } : {}),
    ...style,
  };

  let data: EmbedResult;
  try {
    data = await embed(url, { ...embedOptions, maxWidth, maxHeight });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const fallback = typeof errorFallback === "function" ? errorFallback(error) : errorFallback;

    return (
      <div
        className={className}
        style={containerStyle}
        data-testid="framer-framer-embed"
        data-framer-theme={theme}
      >
        <style id={themeStyleId}>{themeCSS}</style>
        {fallback ?? <ErrorState error={error} />}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={containerStyle}
      data-testid="framer-framer-embed"
      data-framer-theme={theme}
    >
      <style id={themeStyleId}>{themeCSS}</style>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: oEmbed HTML is sanitized by framer-framer core */}
      <div dangerouslySetInnerHTML={{ __html: data.html ?? "" }} />
    </div>
  );
}
