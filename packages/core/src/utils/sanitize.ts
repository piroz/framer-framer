/** Allowed script tag source domains for embed providers */
const ALLOWED_SCRIPT_DOMAINS: ReadonlySet<string> = new Set([
  "platform.twitter.com",
  "cdn.embedly.com",
  "www.tiktok.com",
  "www.instagram.com",
  "connect.facebook.net",
  "embedr.flickr.com",
]);

/** Tags whose content should be stripped entirely (not just the tag) */
const STRIP_CONTENT_TAGS: ReadonlySet<string> = new Set(["script", "style"]);

/** Allowed tags and their permitted attributes */
const ALLOWED_TAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  iframe: new Set([
    "src",
    "width",
    "height",
    "frameborder",
    "allowfullscreen",
    "allow",
    "title",
    "referrerpolicy",
    "sandbox",
    "loading",
    "aria-label",
    "role",
    "tabindex",
  ]),
  blockquote: new Set([
    "class",
    "cite",
    "data-instgrm-permalink",
    "data-instgrm-version",
    "aria-label",
    "role",
    "tabindex",
  ]),
  img: new Set(["src", "alt", "width", "height", "title", "loading"]),
  a: new Set(["href", "title", "target", "rel"]),
  p: new Set(["class"]),
  div: new Set(["class"]),
  span: new Set(["class"]),
  script: new Set(["src", "async", "charset"]),
  br: new Set([]),
  strong: new Set([]),
  em: new Set([]),
};

/** Check if a URL value is safe (not javascript: etc.) */
function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    !trimmed.startsWith("javascript:") &&
    !trimmed.startsWith("data:") &&
    !trimmed.startsWith("vbscript:")
  );
}

/** Check if a script tag's src domain is allowed */
function isAllowedScriptSrc(src: string): boolean {
  try {
    const url = new URL(src);
    return ALLOWED_SCRIPT_DOMAINS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Parse attributes from an opening tag string */
function parseAttributes(
  attrString: string,
): Array<{ name: string; value: string; isBoolean: boolean }> {
  const attrs: Array<{ name: string; value: string; isBoolean: boolean }> = [];
  // Match: name="value", name='value', name=value, or name (boolean attribute)
  const attrRegex = /([a-z][a-z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/gi;
  for (let match = attrRegex.exec(attrString); match !== null; match = attrRegex.exec(attrString)) {
    const name = match[1].toLowerCase();
    const hasValue = match[2] !== undefined || match[3] !== undefined || match[4] !== undefined;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.push({ name, value, isBoolean: !hasValue });
  }
  return attrs;
}

/** Filter attributes based on the allowed set for a tag */
function filterAttributes(
  tagName: string,
  attrs: Array<{ name: string; value: string; isBoolean: boolean }>,
  allowedAttrs: ReadonlySet<string>,
): string {
  const filtered: string[] = [];
  for (const attr of attrs) {
    // Block event handlers
    if (attr.name.startsWith("on")) continue;
    // Only keep allowed attributes
    if (!allowedAttrs.has(attr.name)) continue;
    // Check URL safety for src and href attributes
    if ((attr.name === "src" || attr.name === "href") && !isSafeUrl(attr.value)) continue;
    // For script tags, validate src domain
    if (tagName === "script" && attr.name === "src" && !isAllowedScriptSrc(attr.value)) continue;

    if (attr.isBoolean) {
      filtered.push(attr.name);
    } else {
      const escaped = attr.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      filtered.push(`${attr.name}="${escaped}"`);
    }
  }
  return filtered.length > 0 ? ` ${filtered.join(" ")}` : "";
}

/**
 * Sanitize HTML by allowing only whitelisted tags and attributes.
 * Removes disallowed tags but preserves their text content.
 * Script tags are only allowed when their src points to a trusted provider domain.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  const result: string[] = [];

  // Track if we're inside a tag whose content should be stripped
  let insideStrippedTag: string | null = null;

  // Regex to match tags (opening, closing, self-closing) and text between them
  const tokenRegex = /(<\/?\s*([a-z][a-z0-9]*)\b([^>]*?)(\/?)>)|([^<]+)/gi;

  for (let token = tokenRegex.exec(html); token !== null; token = tokenRegex.exec(html)) {
    const [, fullTag, tagName, attrString, selfClosing, textContent] = token;

    // Text content
    if (textContent !== undefined) {
      if (!insideStrippedTag) {
        result.push(textContent);
      }
      continue;
    }

    if (!fullTag || !tagName) continue;

    const lowerTag = tagName.toLowerCase();
    const isClosing = fullTag.startsWith("</");

    // Handle closing tags
    if (isClosing) {
      if (lowerTag === insideStrippedTag) {
        insideStrippedTag = null;
        continue;
      }
      if (insideStrippedTag) continue;
      if (lowerTag in ALLOWED_TAGS) {
        result.push(`</${lowerTag}>`);
      }
      continue;
    }

    // Handle opening tags
    const allowedAttrs = ALLOWED_TAGS[lowerTag];

    // Strip content of tags like <style> that should not leak their text
    if (!allowedAttrs && STRIP_CONTENT_TAGS.has(lowerTag)) {
      if (!selfClosing) {
        insideStrippedTag = lowerTag;
      }
      continue;
    }

    if (!allowedAttrs) {
      // Tag not allowed — skip it, text content will be preserved
      continue;
    }

    const attrs = parseAttributes(attrString ?? "");

    // Special handling for script tags — only allow trusted src domains
    if (lowerTag === "script") {
      const srcAttr = attrs.find((a) => a.name === "src");
      if (!srcAttr || !isAllowedScriptSrc(srcAttr.value)) {
        if (!selfClosing) {
          insideStrippedTag = "script";
        }
        continue;
      }
    }

    const filteredAttrs = filterAttributes(lowerTag, attrs, allowedAttrs);
    const close = selfClosing ? " /" : "";
    result.push(`<${lowerTag}${filteredAttrs}${close}>`);
  }

  return result.join("");
}
