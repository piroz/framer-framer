import type { EmbedOptions, EmbedResult } from "framer-framer";
import { embed, getProviderInfo } from "framer-framer";
import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";

export interface UseEmbedOptions {
  /** Max embed width */
  maxWidth?: number;
  /** Max embed height */
  maxHeight?: number;
  /** Additional options passed to framer-framer's embed() */
  embedOptions?: EmbedOptions;
}

export interface UseEmbedReturn {
  result: Ref<EmbedResult | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  /** Default aspect ratio from the matched provider (e.g. '16:9') */
  providerAspectRatio: Ref<string | undefined>;
}

/**
 * Composable that resolves a URL to embed data using framer-framer.
 *
 * @example
 * ```ts
 * const { result, loading, error } = useEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * ```
 */
export function useEmbed(url: MaybeRefOrGetter<string>, options?: UseEmbedOptions): UseEmbedReturn {
  const result = ref<EmbedResult | null>(null) as Ref<EmbedResult | null>;
  const loading = ref(true);
  const error = ref<Error | null>(null) as Ref<Error | null>;
  const providerAspectRatio = computed(() => getProviderInfo(toValue(url))?.defaultAspectRatio);

  async function resolve(targetUrl: string) {
    if (!targetUrl) {
      result.value = null;
      loading.value = false;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const embedResult = await embed(targetUrl, {
        ...options?.embedOptions,
        maxWidth: options?.maxWidth,
        maxHeight: options?.maxHeight,
      });
      result.value = embedResult;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      result.value = null;
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => toValue(url),
    (newUrl) => {
      resolve(newUrl);
    },
    { immediate: true },
  );

  return { result, loading, error, providerAspectRatio };
}
