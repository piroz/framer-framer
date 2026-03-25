import { EmbedError } from "../errors.js";

/** Retry configuration */
export interface RetryOptions {
  /** Maximum number of retries (default: 2) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 500) */
  baseDelay?: number;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY = 500;

/** HTTP status codes in EmbedError messages that are retryable */
const RETRYABLE_STATUS_RE = /\b(429|5\d{2})\b/;

/** Check if an error is retryable (network errors, 5xx, 429) */
export function isRetryable(error: unknown): boolean {
  // Network errors (fetch throws TypeError on network failure)
  if (error instanceof TypeError) return true;

  // EmbedError with fetch-related codes — only retry on 5xx / 429
  if (error instanceof EmbedError) {
    if (error.code === "OEMBED_FETCH_FAILED" || error.code === "OGP_FETCH_FAILED") {
      return RETRYABLE_STATUS_RE.test(error.message);
    }
  }

  return false;
}

/** Execute a function with exponential backoff retry */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options?.baseDelay ?? DEFAULT_BASE_DELAY;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isRetryable(error)) {
        const delay = baseDelay * 2 ** attempt;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
