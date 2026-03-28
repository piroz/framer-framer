/// <reference path="./nuxt-app.d.ts" />
import type { EmbedOptions, EmbedResult } from "framer-framer";
import { embed } from "framer-framer";
import { useAsyncData } from "nuxt/app";
import { type MaybeRefOrGetter, toValue } from "vue";

export interface UseNuxtEmbedOptions {
  /** Max embed width */
  maxWidth?: number;
  /** Max embed height */
  maxHeight?: number;
  /** Additional options passed to framer-framer's embed() */
  embedOptions?: EmbedOptions;
  /** Use lazy loading (resolve client-side only). Default: false */
  lazy?: boolean;
}

/**
 * Nuxt SSR composable that resolves a URL to embed data using framer-framer.
 * Uses `useAsyncData` to resolve on the server and hydrate on the client.
 *
 * @example
 * ```ts
 * const { data, status, error, refresh } = useNuxtEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * ```
 */
export function useNuxtEmbed(url: MaybeRefOrGetter<string>, options?: UseNuxtEmbedOptions) {
  const initialUrl = toValue(url);

  return useAsyncData<EmbedResult | null>(
    `framer-framer:${initialUrl}`,
    (): Promise<EmbedResult | null> => {
      const targetUrl = toValue(url);
      if (!targetUrl) return Promise.resolve(null);
      return embed(targetUrl, {
        ...options?.embedOptions,
        maxWidth: options?.maxWidth,
        maxHeight: options?.maxHeight,
      });
    },
    {
      lazy: options?.lazy ?? false,
      watch: [() => toValue(url)],
    },
  );
}
