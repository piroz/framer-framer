import type { EmbedCache } from "./cache.js";
import { resolveWithDiscovery } from "./discovery.js";
import { EmbedError } from "./errors.js";
import { resolveWithOgp } from "./fallback/ogp.js";
import { builtinProviders } from "./providers/index.js";
import type {
  AfterResolveHook,
  BatchEmbedOptions,
  BeforeResolveHook,
  EmbedOptions,
  EmbedResult,
  HookContext,
  MetricsEvent,
  Provider,
} from "./types.js";
import { getMetricsCallbacks } from "./utils/metrics.js";
import { validateUrl } from "./utils/url.js";

/** Registry of providers, checked in order */
const providers: Provider[] = [...builtinProviders];

/** Registered hooks */
const beforeHooks: BeforeResolveHook[] = [];
const afterHooks: AfterResolveHook[] = [];

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
 * Register a hook that runs before resolution.
 * Hooks run in the order they are registered.
 * @returns A function that removes this hook when called.
 */
export function onBeforeResolve(hook: BeforeResolveHook): () => void {
  beforeHooks.push(hook);
  return () => {
    const idx = beforeHooks.indexOf(hook);
    if (idx >= 0) beforeHooks.splice(idx, 1);
  };
}

/**
 * Register a hook that runs after resolution.
 * Hooks run in the order they are registered.
 * @returns A function that removes this hook when called.
 */
export function onAfterResolve(hook: AfterResolveHook): () => void {
  afterHooks.push(hook);
  return () => {
    const idx = afterHooks.indexOf(hook);
    if (idx >= 0) afterHooks.splice(idx, 1);
  };
}

/**
 * Remove all registered hooks.
 * Useful for testing or resetting state.
 */
export function clearHooks(): void {
  beforeHooks.length = 0;
  afterHooks.length = 0;
}

/** Extract the cache instance from options (returns undefined when disabled). */
function getCache(options?: EmbedOptions): EmbedCache | undefined {
  if (!options?.cache) return undefined;
  return options.cache;
}

/**
 * Resolve a URL to embed data.
 * 1. Check cache for a previously resolved result
 * 2. Run beforeResolve hooks (may short-circuit)
 * 3. Try matching providers in order
 * 4. If no provider matches, try oEmbed auto-discovery
 * 5. If discovery fails and fallback is enabled, try OGP
 * 5. Run afterResolve hooks (may transform result)
 * 6. Store result in cache and return
 */
export async function resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  // --- URL validation (SSRF protection) ---
  validateUrl(url);

  // --- cache lookup ---
  const cache = getCache(options);
  if (cache) {
    const cached = cache.get(url, options);
    if (cached) {
      emitMetrics({ url, provider: cached.provider, duration: 0, success: true, cacheHit: true });
      return cached;
    }
  }

  const provider = findProvider(url);

  const context: HookContext = { url, options, provider };
  const startTime = Date.now();

  // --- before hooks ---
  for (const hook of beforeHooks) {
    const shortCircuit = await hook(context);
    if (shortCircuit) {
      const final = await runAfterHooks(context, shortCircuit);
      if (cache) cache.set(url, options, final);
      emitMetrics({
        url,
        provider: final.provider,
        duration: Date.now() - startTime,
        success: true,
        cacheHit: false,
      });
      return final;
    }
  }

  // --- resolve ---
  let result: EmbedResult | undefined;
  let resolvedProvider = provider?.name ?? "unknown";

  try {
    if (provider) {
      result = await provider.resolve(context.url, context.options);
    } else {
      // Try oEmbed auto-discovery before OGP fallback
      if (context.options?.discovery !== false) {
        result = (await resolveWithDiscovery(context.url, context.options)) ?? undefined;
        if (result) resolvedProvider = "discovery";
      }

      if (!result) {
        const useFallback = context.options?.fallback !== false;
        if (useFallback) {
          result = await resolveWithOgp(context.url, context.options);
          resolvedProvider = "ogp";
        } else {
          throw new EmbedError(
            "PROVIDER_NOT_FOUND",
            `No provider found for URL: ${context.url}. ` +
              "Set options.fallback = true to try OGP metadata extraction.",
          );
        }
      }
    }
  } catch (err) {
    const errorCode = err instanceof EmbedError ? err.code : "OEMBED_FETCH_FAILED";
    emitMetrics({
      url,
      provider: resolvedProvider,
      duration: Date.now() - startTime,
      success: false,
      cacheHit: false,
      errorCode,
    });
    throw err;
  }

  // --- after hooks ---
  const final = await runAfterHooks(context, result);

  // --- cache store ---
  if (cache) cache.set(url, options, final);

  emitMetrics({
    url,
    provider: final.provider,
    duration: Date.now() - startTime,
    success: true,
    cacheHit: false,
  });

  return final;
}

/** Default concurrency for batch resolution */
const DEFAULT_CONCURRENCY = 5;

/**
 * Resolve multiple URLs to embed data in parallel.
 * Individual failures are returned as `EmbedError` instances in the result array
 * rather than throwing, so partial success is always possible.
 *
 * @param urls - Array of URLs to resolve
 * @param options - Embed options with optional `concurrency` (default: 5)
 * @returns Array of results in the same order as the input URLs
 */
export async function resolveBatch(
  urls: string[],
  options?: BatchEmbedOptions,
): Promise<(EmbedResult | EmbedError)[]> {
  if (urls.length === 0) return [];

  const { concurrency = DEFAULT_CONCURRENCY, ...embedOptions } = options ?? {};
  const results: (EmbedResult | EmbedError)[] = new Array(urls.length);

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < urls.length) {
      const i = nextIndex++;
      try {
        results[i] = await resolve(urls[i], embedOptions);
      } catch (err) {
        results[i] =
          err instanceof EmbedError
            ? err
            : new EmbedError(
                "OEMBED_FETCH_FAILED",
                err instanceof Error ? err.message : String(err),
                { cause: err },
              );
      }
    }
  }

  const workerCount = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/** Emit a metrics event to all registered callbacks */
function emitMetrics(event: MetricsEvent): void {
  for (const callback of getMetricsCallbacks()) {
    callback(event);
  }
}

async function runAfterHooks(context: HookContext, result: EmbedResult): Promise<EmbedResult> {
  let current = result;
  for (const hook of afterHooks) {
    const replaced = await hook(context, current);
    if (replaced) {
      current = replaced;
    }
  }
  return current;
}
