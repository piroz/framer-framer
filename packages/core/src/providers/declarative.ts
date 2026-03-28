import type { EmbedOptions, EmbedResult, Provider, ProviderSchema } from "../types.js";
import { OEmbedProvider } from "./base.js";

/**
 * Convert a glob-style string pattern to a RegExp.
 * Supports `*` (any characters except `/`) and `**` (any characters including `/`).
 */
function globToRegExp(pattern: string): RegExp {
  let result = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      result += ".*";
      i++; // skip second *
    } else if (pattern[i] === "*") {
      result += "[^/]*";
    } else if (
      ".+?^$|[]\\/".includes(pattern[i]) ||
      pattern[i] === "(" ||
      pattern[i] === ")" ||
      pattern[i] === "{" ||
      pattern[i] === "}"
    ) {
      result += `\\${pattern[i]}`;
    } else {
      result += pattern[i];
    }
  }
  return new RegExp(`^${result}$`);
}

function toRegExp(pattern: string | RegExp): RegExp {
  return typeof pattern === "string" ? globToRegExp(pattern) : pattern;
}

function validateSchema(schema: ProviderSchema): void {
  if (!schema.name || typeof schema.name !== "string") {
    throw new Error("ProviderSchema: 'name' is required and must be a non-empty string");
  }
  if (!schema.endpoint || typeof schema.endpoint !== "string") {
    throw new Error("ProviderSchema: 'endpoint' is required and must be a non-empty string");
  }
  if (!Array.isArray(schema.urlPatterns) || schema.urlPatterns.length === 0) {
    throw new Error("ProviderSchema: 'urlPatterns' is required and must be a non-empty array");
  }
}

/** Create a single Provider from a declarative schema */
export function defineProvider(schema: ProviderSchema): Provider {
  validateSchema(schema);

  const patterns = schema.urlPatterns.map(toRegExp);
  const transform = schema.options?.transform;
  const normalizeUrl = schema.options?.normalizeUrl;
  const validate = schema.options?.validate;

  class DeclarativeProvider extends OEmbedProvider {
    name = schema.name;
    protected endpoint = schema.endpoint;
    protected patterns = patterns;
    override readonly defaultAspectRatio = schema.defaultAspectRatio;
    override readonly embedType = schema.embedType;
    override readonly supportsMaxWidth = schema.supportsMaxWidth ?? true;
    override readonly brandColor = schema.brandColor;

    override async resolve(url: string, options?: EmbedOptions): Promise<EmbedResult> {
      if (validate) {
        validate(url);
      }
      return super.resolve(url, options);
    }

    protected override buildOEmbedUrl(url: string, options?: EmbedOptions): string {
      const effectiveUrl = normalizeUrl ? normalizeUrl(url) : url;
      return super.buildOEmbedUrl(effectiveUrl, options);
    }

    protected override toEmbedResult(url: string, data: Record<string, unknown>): EmbedResult {
      if (transform) {
        return transform(data, url);
      }
      return super.toEmbedResult(url, data);
    }
  }

  return new DeclarativeProvider();
}

/** Create multiple Providers from an array of declarative schemas */
export function defineProviders(schemas: ProviderSchema[]): Provider[] {
  return schemas.map(defineProvider);
}
