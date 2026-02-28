import type { EmbedOptions, EmbedResult, Provider } from './types.js';
import { resolveWithOgp } from './fallback/ogp.js';
import { builtinProviders } from './providers/index.js';

/** Registry of providers, checked in order */
const providers: Provider[] = [...builtinProviders];

/**
 * Find the matching provider for a URL.
 * Custom providers are checked first (they are prepended to the list).
 */
export function findProvider(url: string): Provider | undefined {
  return providers.find((p) => p.match(url));
}

/**
 * Register a custom provider.
 * Custom providers are added to the beginning of the list so they take
 * priority over built-in providers.
 */
export function registerProvider(provider: Provider): void {
  providers.unshift(provider);
}

/**
 * Resolve a URL to embed data.
 * 1. Try matching providers in order
 * 2. If no provider matches and fallback is enabled, try OGP
 * 3. Throw if nothing works
 */
export async function resolve(
  url: string,
  options?: EmbedOptions,
): Promise<EmbedResult> {
  const provider = findProvider(url);

  if (provider) {
    return provider.resolve(url, options);
  }

  // OGP fallback
  const useFallback = options?.fallback !== false;
  if (useFallback) {
    return resolveWithOgp(url);
  }

  throw new Error(
    `No provider found for URL: ${url}. ` +
      'Set options.fallback = true to try OGP metadata extraction.',
  );
}
