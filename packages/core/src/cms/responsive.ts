/** Options for responsive embed wrapping */
export interface ResponsiveOptions {
  /** Embed width in pixels (used for aspect ratio calculation) */
  width?: number;
  /** Embed height in pixels (used for aspect ratio calculation) */
  height?: number;
  /** Maximum width constraint (e.g. "640px", "100%"). Default: "100%" */
  maxWidth?: string;
  /**
   * Style output mode.
   * - `"inline"` (default): inline `style` attributes on the wrapper elements
   * - `"class"`: CSS class names on the wrapper elements (you provide the CSS)
   */
  mode?: "inline" | "class";
  /** Custom CSS class name for the outer wrapper. Only used when `mode` is `"class"`. Default: "embed-responsive" */
  className?: string;
}

/**
 * Wrap embed HTML in a responsive container that maintains aspect ratio.
 *
 * When `width` and `height` are provided, the wrapper uses the
 * padding-bottom percentage technique to preserve the aspect ratio.
 * When dimensions are unknown, a simple width-100% wrapper is applied.
 *
 * @example
 * ```ts
 * import { wrapResponsive } from "framer-framer";
 *
 * // With known dimensions (aspect ratio preserved)
 * const html = wrapResponsive('<iframe src="..."></iframe>', {
 *   width: 640,
 *   height: 360,
 * });
 *
 * // With CSS class output
 * const html = wrapResponsive('<iframe src="..."></iframe>', {
 *   width: 640,
 *   height: 360,
 *   mode: "class",
 *   className: "my-embed",
 * });
 * ```
 */
export function wrapResponsive(html: string, options?: ResponsiveOptions): string {
  const {
    width,
    height,
    maxWidth = "100%",
    mode = "inline",
    className = "embed-responsive",
  } = options ?? {};

  const hasAspectRatio = width != null && height != null && width > 0 && height > 0;

  if (mode === "class") {
    return wrapWithClass(html, { hasAspectRatio, width, height, className });
  }

  return wrapWithInlineStyle(html, { hasAspectRatio, width, height, maxWidth });
}

function wrapWithInlineStyle(
  html: string,
  opts: { hasAspectRatio: boolean; width?: number; height?: number; maxWidth: string },
): string {
  if (!opts.hasAspectRatio) {
    return `<div style="position:relative;width:100%;max-width:${escapeAttr(opts.maxWidth)}">${html}</div>`;
  }

  const paddingBottom = ((Number(opts.height) / Number(opts.width)) * 100).toFixed(4);

  return (
    `<div style="position:relative;width:100%;max-width:${escapeAttr(opts.maxWidth)}">` +
    `<div style="position:relative;padding-bottom:${paddingBottom}%;height:0;overflow:hidden">` +
    `<div style="position:absolute;top:0;left:0;width:100%;height:100%">` +
    `${html}` +
    `</div></div></div>`
  );
}

function wrapWithClass(
  html: string,
  opts: { hasAspectRatio: boolean; width?: number; height?: number; className: string },
): string {
  const cls = escapeAttr(opts.className);

  if (!opts.hasAspectRatio) {
    return `<div class="${cls}">${html}</div>`;
  }

  const paddingBottom = ((Number(opts.height) / Number(opts.width)) * 100).toFixed(4);

  return (
    `<div class="${cls}">` +
    `<div class="${cls}__ratio" style="padding-bottom:${paddingBottom}%">` +
    `<div class="${cls}__inner">` +
    `${html}` +
    `</div></div></div>`
  );
}

/** Escape a string for safe use in an HTML attribute value */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
