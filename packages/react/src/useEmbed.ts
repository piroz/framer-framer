import { type EmbedOptions, type EmbedResult, embed, getProviderInfo } from "framer-framer";
import { useEffect, useMemo, useState } from "react";
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
 *
 * @example SSR with pre-fetched data
 * ```tsx
 * // Pass initialData from a Server Component to skip client-side fetch
 * const { data } = useEmbed(url, { initialData: serverFetchedResult });
 * ```
 */
export function useEmbed(
  url: string,
  options?: EmbedOptions & { maxWidth?: number; maxHeight?: number; initialData?: EmbedResult },
): UseEmbedReturn {
  const initialData = options?.initialData;
  const [state, setState] = useState<Omit<UseEmbedReturn, "providerAspectRatio">>(
    initialData
      ? { status: "success", data: initialData, error: null }
      : { status: "loading", data: null, error: null },
  );

  const providerAspectRatio = useMemo(() => {
    return getProviderInfo(url)?.defaultAspectRatio ?? undefined;
  }, [url]);

  const serializedOptions = serializeOptions(options);

  useEffect(() => {
    if (initialData) return;

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
  }, [url, serializedOptions, initialData]);

  return { ...state, providerAspectRatio };
}
