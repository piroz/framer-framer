import { DEFAULT_TIMEOUT_MS } from "../constants.js";
import { EmbedError } from "../errors.js";
import type { EmbedOptions, EmbedResult } from "../types.js";
import { withRetry } from "../utils/retry.js";

/** Escape special HTML characters to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Simple regex-based OGP meta tag extraction */
function extractMetaContent(html: string, property: string): string | undefined {
  // Match both property="og:xxx" and name="og:xxx" variants
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']` +
      `|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`,
    "i",
  );
  const match = regex.exec(html);
  return match?.[1] ?? match?.[2] ?? undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve embed data from a URL using OGP meta tags.
 * This is the fallback when no dedicated provider matches.
 */
export async function resolveWithOgp(url: string, options?: EmbedOptions): Promise<EmbedResult> {
  const html = await withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "framer-framer/1.0 (OGP embed resolver)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new EmbedError(
        "OGP_FETCH_FAILED",
        `OGP fallback: failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  }, options?.retry);

  const title = extractMetaContent(html, "og:title") ?? extractMetaContent(html, "twitter:title");
  const description =
    extractMetaContent(html, "og:description") ?? extractMetaContent(html, "twitter:description");
  const image = extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image");
  const siteName = extractMetaContent(html, "og:site_name");
  const ogType = extractMetaContent(html, "og:type");

  // Check for og:video (some sites provide direct video embed URLs)
  const videoUrl = extractMetaContent(html, "og:video:url") ?? extractMetaContent(html, "og:video");
  const videoType = extractMetaContent(html, "og:video:type");

  let embedHtml: string;
  let embedType: EmbedResult["type"];

  if (videoUrl && videoType?.includes("text/html")) {
    // Embeddable video player
    embedType = "video";
    const safeVideoUrl = escapeHtml(videoUrl);
    const safeTitle = escapeHtml(title ?? "");
    embedHtml =
      `<iframe src="${safeVideoUrl}" width="480" height="270" ` +
      `frameborder="0" allowfullscreen title="${safeTitle}"></iframe>`;
  } else {
    // Rich link card
    embedType = "link";
    embedHtml = buildLinkCard({ url, title, description, image, siteName });
  }

  return {
    type: embedType,
    html: embedHtml,
    provider: siteName ?? new URL(url).hostname,
    title,
    thumbnail_url: image,
    url,
    raw: {
      og_type: ogType,
      og_title: title,
      og_description: description,
      og_image: image,
      og_site_name: siteName,
      og_video: videoUrl,
    },
  };
}

/** Build a simple HTML link card from OGP data */
function buildLinkCard(params: {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}): string {
  const { url, title, description, image, siteName } = params;
  const parts: string[] = ['<div class="framer-framer-card">'];

  if (image) {
    parts.push(`  <img src="${escapeHtml(image)}" alt="${escapeHtml(title ?? "")}" />`);
  }
  parts.push('  <div class="framer-framer-card-body">');
  if (title) {
    parts.push(
      `    <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`,
    );
  }
  if (description) {
    parts.push(`    <p>${escapeHtml(description)}</p>`);
  }
  if (siteName) {
    parts.push(`    <span>${escapeHtml(siteName)}</span>`);
  }
  parts.push("  </div>");
  parts.push("</div>");

  return parts.join("\n");
}
