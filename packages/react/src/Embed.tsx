import type { CSSProperties } from "react";
import { forwardRef, useEffect } from "react";
import { ErrorState } from "./ErrorState.js";
import { Skeleton } from "./Skeleton.js";
import type { EmbedProps } from "./types.js";
import { useEmbed } from "./useEmbed.js";

/**
 * Embed component - renders any URL as an embedded widget.
 *
 * @example
 * ```tsx
 * <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
 * <Embed url="https://x.com/jack/status/20" maxWidth={550} />
 * ```
 */
export const Embed = forwardRef<HTMLDivElement, EmbedProps>(function Embed(
  {
    url,
    maxWidth,
    maxHeight,
    embedOptions,
    onLoad,
    onError,
    loadingFallback,
    errorFallback,
    className,
    style,
  },
  ref,
) {
  const { status, data, error } = useEmbed(url, {
    ...embedOptions,
    maxWidth,
    maxHeight,
  });

  useEffect(() => {
    if (status === "success" && data && onLoad) {
      onLoad(data);
    }
    if (status === "error" && error && onError) {
      onError(error);
    }
  }, [status, data, error, onLoad, onError]);

  const containerStyle: CSSProperties = {
    ...(maxWidth ? { maxWidth } : {}),
    ...(maxHeight ? { maxHeight, overflow: "hidden" } : {}),
    ...style,
  };

  if (status === "loading") {
    return (
      <div ref={ref} className={className} style={containerStyle} data-testid="framer-framer-embed">
        {loadingFallback ?? <Skeleton maxWidth={maxWidth} />}
      </div>
    );
  }

  if (status === "error" && error) {
    const fallback = typeof errorFallback === "function" ? errorFallback(error) : errorFallback;

    return (
      <div ref={ref} className={className} style={containerStyle} data-testid="framer-framer-embed">
        {fallback ?? <ErrorState error={error} />}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={containerStyle}
      data-testid="framer-framer-embed"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: oEmbed HTML is sanitized by framer-framer core
      dangerouslySetInnerHTML={{ __html: data?.html ?? "" }}
    />
  );
});
