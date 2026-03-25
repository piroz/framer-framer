import { describe, expect, it } from "vitest";
import { EmbedError } from "../src/errors.js";

describe("EmbedError", () => {
  it("is an instance of Error", () => {
    const err = new EmbedError("PROVIDER_NOT_FOUND", "no provider");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EmbedError);
  });

  it("has name, code, and message", () => {
    const err = new EmbedError("OEMBED_FETCH_FAILED", "fetch failed");
    expect(err.name).toBe("EmbedError");
    expect(err.code).toBe("OEMBED_FETCH_FAILED");
    expect(err.message).toBe("fetch failed");
  });

  it("preserves cause", () => {
    const cause = new TypeError("network error");
    const err = new EmbedError("OEMBED_FETCH_FAILED", "fetch failed", { cause });
    expect(err.cause).toBe(cause);
  });

  it("serializes to JSON", () => {
    const err = new EmbedError("VALIDATION_ERROR", "invalid input");
    const json = err.toJSON();
    expect(json).toEqual({
      name: "EmbedError",
      code: "VALIDATION_ERROR",
      message: "invalid input",
    });
  });

  it("works with JSON.stringify", () => {
    const err = new EmbedError("TIMEOUT", "request timed out");
    const parsed = JSON.parse(JSON.stringify(err));
    expect(parsed.name).toBe("EmbedError");
    expect(parsed.code).toBe("TIMEOUT");
    expect(parsed.message).toBe("request timed out");
  });

  it("has correct code for each error type", () => {
    const codes = [
      "PROVIDER_NOT_FOUND",
      "OEMBED_FETCH_FAILED",
      "OEMBED_PARSE_ERROR",
      "OGP_FETCH_FAILED",
      "OGP_PARSE_ERROR",
      "VALIDATION_ERROR",
      "TIMEOUT",
    ] as const;

    for (const code of codes) {
      const err = new EmbedError(code, `test ${code}`);
      expect(err.code).toBe(code);
    }
  });
});
