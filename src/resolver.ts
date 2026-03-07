import { EmbedError } from "./errors.js";
import { resolveWithOgp } from "./fallback/ogp.js";
import { builtinProviders } from "./providers/index.js";
import type {
  AfterResolveHook,
  BeforeResolveHook,
  EmbedOptions,
  EmbedResult,
  HookContext,
  Provider,
} from "./types.js";

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

/**
 * Resolve a URL to embed data.
 * 1. Run beforeResolve hooks (may short-circuit)
 * 2. Try matching providers in order
 * 3. If no provider matches and fallback is enabled, try OGP
 * 4. Run afterResolve hooks (may transform result)
 * 5. Throw if nothing works
 */
export async function resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  const provider = findProvider(url);

  const context: HookContext = { url, options, provider };

  // --- before hooks ---
  for (const hook of beforeHooks) {
    const shortCircuit = await hook(context);
    if (shortCircuit) {
      return runAfterHooks(context, shortCircuit);
    }
  }

  // --- resolve ---
  let result: EmbedResult;

  if (provider) {
    result = await provider.resolve(context.url, context.options);
  } else {
    const useFallback = context.options?.fallback !== false;
    if (useFallback) {
      result = await resolveWithOgp(context.url);
    } else {
      throw new EmbedError(
        "PROVIDER_NOT_FOUND",
        `No provider found for URL: ${context.url}. ` +
          "Set options.fallback = true to try OGP metadata extraction.",
      );
    }
  }

  // --- after hooks ---
  return runAfterHooks(context, result);
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
