/** Error codes for embed resolution failures */
export type EmbedErrorCode =
  | "PROVIDER_NOT_FOUND"
  | "OEMBED_FETCH_FAILED"
  | "OEMBED_PARSE_ERROR"
  | "OGP_FETCH_FAILED"
  | "OGP_PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "TIMEOUT";

/** Structured error class for embed resolution failures */
export class EmbedError extends Error {
  readonly code: EmbedErrorCode;

  constructor(code: EmbedErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbedError";
    this.code = code;
  }

  toJSON(): { name: string; code: EmbedErrorCode; message: string } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
