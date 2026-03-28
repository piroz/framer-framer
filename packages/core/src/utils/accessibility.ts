import type { AccessibilityOptions, EmbedResult } from "../types.js";
import { escapeHtml } from "./html.js";

/** Tags that receive accessibility attributes */
const A11Y_TARGETS = /(<(?:iframe|blockquote)\b)([^>]*>)/gi;

/** Check if an attribute already exists on a tag */
function hasAttr(attrs: string, name: string): boolean {
  return new RegExp(`\\b${name}\\s*=`, "i").test(attrs);
}

/**
 * Build the default aria-label from provider name and title.
 * Format: "Provider: Title" or just "Provider" if no title.
 */
function buildAriaLabel(result: EmbedResult): string {
  const provider = result.provider;
  const title = result.title;
  if (title) {
    return `${provider}: ${title}`;
  }
  return provider;
}

/**
 * Enhance embed HTML with accessibility attributes.
 *
 * Adds `title`, `aria-label`, and `tabindex` to iframe and blockquote elements
 * if they are not already present. Respects user-provided overrides via
 * `AccessibilityOptions`.
 */
export function enhanceAccessibility(
  html: string,
  result: EmbedResult,
  options?: AccessibilityOptions | boolean,
): string {
  if (options === false) return html;

  const opts: AccessibilityOptions = typeof options === "object" ? options : {};
  const ariaLabel = opts.ariaLabel ?? buildAriaLabel(result);
  const tabIndex = opts.tabIndex ?? 0;
  const role = opts.role;

  return html.replace(A11Y_TARGETS, (_, tagOpen: string, rest: string) => {
    let injected = "";

    if (!hasAttr(rest, "title") && result.title) {
      injected += ` title="${escapeHtml(result.title)}"`;
    }

    if (!hasAttr(rest, "aria-label")) {
      injected += ` aria-label="${escapeHtml(ariaLabel)}"`;
    }

    if (!hasAttr(rest, "tabindex")) {
      injected += ` tabindex="${tabIndex}"`;
    }

    if (role && !hasAttr(rest, "role")) {
      injected += ` role="${escapeHtml(role)}"`;
    }

    return `${tagOpen}${injected}${rest}`;
  });
}
