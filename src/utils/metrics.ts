import type { MetricsCallback } from "../types.js";

/** Registered metrics callbacks */
const metricsCallbacks: MetricsCallback[] = [];

/**
 * Register a callback that receives metrics events after each resolution.
 * Callbacks run in the order they are registered.
 * @returns A function that removes this callback when called.
 */
export function onMetrics(callback: MetricsCallback): () => void {
  metricsCallbacks.push(callback);
  return () => {
    const idx = metricsCallbacks.indexOf(callback);
    if (idx >= 0) metricsCallbacks.splice(idx, 1);
  };
}

/**
 * Remove all registered metrics callbacks.
 * Useful for testing or resetting state.
 */
export function clearMetrics(): void {
  metricsCallbacks.length = 0;
}

/** Get the registered callbacks (internal use only) */
export function getMetricsCallbacks(): readonly MetricsCallback[] {
  return metricsCallbacks;
}
