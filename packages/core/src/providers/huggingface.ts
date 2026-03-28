import { IframeProvider } from "./iframe-base.js";

/**
 * Hugging Face Spaces provider.
 *
 * Embeds interactive AI applications (Gradio, Streamlit, Docker, static)
 * hosted on Hugging Face Spaces.
 *
 * URL patterns:
 *   - https://huggingface.co/spaces/{owner}/{name}
 *   - https://huggingface.co/spaces/{owner}/{name}/...
 *
 * Embed URL:
 *   - https://huggingface.co/spaces/{owner}/{name}/embed
 */
export class HuggingFaceProvider extends IframeProvider {
  name = "huggingface";
  readonly defaultAspectRatio = "4:3";
  readonly embedType = "rich" as const;
  override readonly brandColor = "#FFD21E";

  protected defaultWidth = 800;
  protected defaultHeight = 600;

  /** Matches owner/name from a Hugging Face Spaces URL */
  private static readonly SPACE_RE = /^(https?:\/\/huggingface\.co\/spaces\/([\w.-]+)\/([\w.-]+))/;

  protected patterns = [HuggingFaceProvider.SPACE_RE];

  protected buildEmbedUrl(url: string): string | null {
    const match = HuggingFaceProvider.SPACE_RE.exec(url);
    if (!match) return null;
    return `${match[1]}/embed`;
  }

  protected extractTitle(url: string): string | undefined {
    const match = HuggingFaceProvider.SPACE_RE.exec(url);
    if (!match) return undefined;
    return `${match[2]}/${match[3]} - Hugging Face Space`;
  }
}
