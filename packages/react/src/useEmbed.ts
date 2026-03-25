import { type EmbedOptions, embed } from "framer-framer";
import { useEffect, useState } from "react";
import type { UseEmbedReturn } from "./types.js";

function serializeOptions(
  options?: EmbedOptions & { maxWidth?: number; maxHeight?: number },
): string {
  if (!options) return "{}";
  return JSON.stringify({
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    fallback: options.fallback,
    timeout: options.timeout,
    discovery: options.discovery,
    sanitize: options.sanitize,
  });
}

function parseOptions(
  serialized: string,
): Partial<EmbedOptions & { maxWidth?: number; maxHeight?: number }> {
  return JSON.parse(serialized);
}

/**
 * React hook to resolve a URL to embed data.
 *
 * @example
 * ```tsx
 * const { status, data, error } = useEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * if (status === 'loading') return <p>Loading...</p>;
 * if (status === 'error') return <p>Error: {error.message}</p>;
 * return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
 * ```
 */
export function useEmbed(
  url: string,
  options?: EmbedOptions & { maxWidth?: number; maxHeight?: number },
): UseEmbedReturn {
  const [state, setState] = useState<UseEmbedReturn>({
    status: "loading",
    data: null,
    error: null,
  });

  const serializedOptions = serializeOptions(options);

  useEffect(() => {
    let cancelled = false;
    const opts = parseOptions(serializedOptions);

    setState({ status: "loading", data: null, error: null });

    embed(url, opts)
      .then((result) => {
        if (!cancelled) {
          setState({ status: "success", data: result, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState({ status: "error", data: null, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, serializedOptions]);

  return state;
}
