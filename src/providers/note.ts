import { OEmbedProvider } from "./base.js";

export class NoteProvider extends OEmbedProvider {
  name = "note";
  readonly embedType = "rich" as const;

  protected endpoint = "https://note.com/api/oembed";

  protected patterns = [
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/n\/[\w-]+/,
    /^https?:\/\/(www\.)?note\.com\/[\w-]+\/m\/[\w-]+/,
  ];
}
