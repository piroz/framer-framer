import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbedError } from "../../src/errors.js";
import { isRetryable, withRetry } from "../../src/utils/retry.js";

describe("isRetryable", () => {
  it("returns true for TypeError (network failure)", () => {
    expect(isRetryable(new TypeError("fetch failed"))).toBe(true);
  });

  it("returns true for EmbedError with 5xx status", () => {
    expect(
      isRetryable(
        new EmbedError("OEMBED_FETCH_FAILED", "request failed: 500 Internal Server Error"),
      ),
    ).toBe(true);
    expect(
      isRetryable(new EmbedError("OGP_FETCH_FAILED", "failed to fetch: 503 Service Unavailable")),
    ).toBe(true);
  });

  it("returns true for EmbedError with 429 status", () => {
    expect(
      isRetryable(new EmbedError("OEMBED_FETCH_FAILED", "request failed: 429 Too Many Requests")),
    ).toBe(true);
  });

  it("returns false for EmbedError with 4xx status (not 429)", () => {
    expect(
      isRetryable(new EmbedError("OEMBED_FETCH_FAILED", "request failed: 404 Not Found")),
    ).toBe(false);
    expect(
      isRetryable(new EmbedError("OEMBED_FETCH_FAILED", "request failed: 403 Forbidden")),
    ).toBe(false);
  });

  it("returns false for EmbedError with non-fetch codes", () => {
    expect(isRetryable(new EmbedError("OEMBED_PARSE_ERROR", "not valid JSON"))).toBe(false);
    expect(isRetryable(new EmbedError("PROVIDER_NOT_FOUND", "no provider"))).toBe(false);
    expect(isRetryable(new EmbedError("VALIDATION_ERROR", "invalid input"))).toBe(false);
  });

  it("returns false for generic Error", () => {
    expect(isRetryable(new Error("something broke"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isRetryable("string error")).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValue("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries up to maxRetries times", async () => {
    const error = new EmbedError(
      "OEMBED_FETCH_FAILED",
      "request failed: 500 Internal Server Error",
    );
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 }).catch((e) => e);

    // First retry after 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry after 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe(error);
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("does not retry non-retryable errors", async () => {
    const error = new EmbedError("OEMBED_PARSE_ERROR", "not valid JSON");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxRetries: 3, baseDelay: 100 });

    // First retry after 100ms (100 * 2^0)
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("skips retry when maxRetries is 0", async () => {
    const error = new TypeError("fetch failed");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
