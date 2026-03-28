import { IframeProvider } from "./iframe-base.js";

/**
 * Gradio provider.
 *
 * Embeds standalone Gradio applications hosted on:
 *   - Hugging Face Spaces direct URLs: https://{owner}-{name}.hf.space
 *   - Gradio temporary share links: https://{hash}.gradio.live
 *
 * These URLs are already embeddable as-is (the page itself is a Gradio app).
 *
 * Note: `huggingface.co/spaces/...` URLs are handled by HuggingFaceProvider.
 * This provider handles the direct Gradio app URLs.
 */
export class GradioProvider extends IframeProvider {
  name = "gradio";
  readonly defaultAspectRatio = "4:3";
  readonly embedType = "rich" as const;
  override readonly brandColor = "#F97316";

  protected defaultWidth = 800;
  protected defaultHeight = 600;

  protected patterns = [
    /^https?:\/\/[\w-]+-[\w-]+\.hf\.space\/?/,
    /^https?:\/\/[\da-f]+[\da-f-]*\.gradio\.live\/?/,
  ];

  protected buildEmbedUrl(url: string): string | null {
    // These URLs are already embeddable; just normalize to origin
    return this.parseOrigin(url);
  }

  protected extractTitle(url: string): string | undefined {
    const origin = this.parseOrigin(url);
    if (!origin) return undefined;

    const host = new URL(origin).hostname;
    if (host.endsWith(".hf.space")) {
      const name = host.slice(0, -".hf.space".length);
      return `${name} — Gradio App`;
    }
    if (host.endsWith(".gradio.live")) {
      return "Gradio App (shared)";
    }
    return undefined;
  }

  private parseOrigin(url: string): string | null {
    try {
      return `${new URL(url).origin}/`;
    } catch {
      return null;
    }
  }
}
