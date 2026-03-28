import type { EmbedResult } from "../types.js";
import { escapeHtml } from "../utils/html.js";

/** Default brand color used when a provider does not define one */
const DEFAULT_BRAND_COLOR = "#6B7280";

/**
 * Build an error fallback EmbedResult with provider branding.
 *
 * Generates a styled HTML card that displays:
 * - Provider initial in a branded circle
 * - Provider name
 * - Original URL as a clickable link
 */
export function buildErrorFallback(params: {
  url: string;
  provider: string;
  brandColor?: string;
}): EmbedResult {
  const { url, provider, brandColor = DEFAULT_BRAND_COLOR } = params;
  const initial = provider.charAt(0).toUpperCase();
  const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const safeUrl = escapeHtml(url);
  const safeName = escapeHtml(displayName);
  const safeColor = escapeHtml(brandColor);
  const safeInitial = escapeHtml(initial);

  const html = [
    `<div class="framer-framer-error" style="display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;max-width:480px">`,
    `  <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:${safeColor};display:flex;align-items:center;justify-content:center">`,
    `    <span style="color:#fff;font-weight:700;font-size:18px;line-height:1">${safeInitial}</span>`,
    `  </div>`,
    `  <div style="min-width:0">`,
    `    <div style="font-size:14px;font-weight:600;color:#374151">${safeName}</div>`,
    `    <a href="${safeUrl}" target="_blank" rel="noopener" style="font-size:13px;color:#6b7280;text-decoration:underline;word-break:break-all">${safeUrl}</a>`,
    `  </div>`,
    `</div>`,
  ].join("\n");

  return {
    type: "link",
    html,
    provider,
    url,
  };
}
