import { OEmbedProvider } from "./base.js";

/**
 * @deprecated note does not provide a public oEmbed endpoint.
 * URLs matching note.com will fall back to OGP resolution when `fallback` is enabled (default).
 * This class is retained for backward compatibility but is no longer included in `builtinProviders`.
 */
export class NoteProvider extends OEmbedProvider {
  name = "note";
  readonly embedType = "rich" as const;

  protected endpoint = "https://note.com/api/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/n\/[\w-]+/,
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/m\/[\w-]+/,
  ];
}
