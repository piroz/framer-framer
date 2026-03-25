import { EmbedError } from "../errors.js";

/** Maximum allowed URL length */
const MAX_URL_LENGTH = 2048;

/** Maximum URL length to include in error messages */
const MAX_URL_IN_ERROR = 200;

/** Allowed protocols */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** IPv4 private/reserved ranges (SSRF protection) */
const PRIVATE_IPV4_PATTERNS = [
  /^127\./, // 127.0.0.0/8 (loopback)
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^0\./, // 0.0.0.0/8
];

/** Hostnames that resolve to loopback/private addresses */
const BLOCKED_HOSTNAMES = new Set(["localhost"]);

/** IPv6 loopback and private addresses */
const BLOCKED_IPV6 = new Set(["::1", "fe80::1", "::"]);

/** IPv4-mapped IPv6 prefix */
const IPV4_MAPPED_IPV6_PREFIX = "::ffff:";

/**
 * Truncate a URL for safe inclusion in error messages.
 */
function truncateUrl(url: string): string {
  if (url.length <= MAX_URL_IN_ERROR) return url;
  return `${url.slice(0, MAX_URL_IN_ERROR)}…`;
}

/**
 * Check if an IPv4 address string falls within a private/reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Parse a hostname that might be a numeric IP (decimal, hex, octal)
 * into a normalised dotted-decimal IPv4 string, or return `null` if
 * the hostname is not a numeric IP literal.
 *
 * Handles:
 * - Decimal integer: `2130706433` → `127.0.0.1`
 * - Hex integer: `0x7f000001` → `127.0.0.1`
 * - Octal components: `0177.0.0.1` → `127.0.0.1`
 */
function normalizeNumericIPv4(hostname: string): string | null {
  // Single integer (decimal or hex) — e.g. 2130706433, 0x7f000001
  if (/^(0x[\da-f]+|\d+)$/i.test(hostname)) {
    const num = Number(hostname);
    if (!Number.isFinite(num) || num < 0 || num > 0xffffffff) return null;
    const n = num >>> 0; // ensure unsigned 32-bit
    return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
  }

  // Dotted notation with possible octal/hex components — e.g. 0177.0.0.01
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0x[\da-f]+|0[0-7]*|\d+)$/i.test(part)) return null;
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    octets.push(n);
  }

  return octets.join(".");
}

/**
 * Parse the suffix of an IPv4-mapped IPv6 address into a dotted-decimal
 * IPv4 string. The URL parser may produce either:
 * - Dotted form: `127.0.0.1`
 * - Hex form: `7f00:1` (two 16-bit groups)
 *
 * Returns the dotted-decimal IPv4, or `null` if not parseable.
 */
function parseIPv4FromMappedSuffix(suffix: string): string | null {
  // Dotted decimal form (e.g. "127.0.0.1")
  if (suffix.includes(".")) return suffix;

  // Hex form (e.g. "7f00:1") — two 16-bit hex groups
  const hexParts = suffix.split(":");
  if (hexParts.length !== 2) return null;

  const hi = Number.parseInt(hexParts[0], 16);
  const lo = Number.parseInt(hexParts[1], 16);
  if (Number.isNaN(hi) || Number.isNaN(lo) || hi > 0xffff || lo > 0xffff) return null;

  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * Validate a URL for safe embed resolution.
 * Throws `EmbedError` with code `VALIDATION_ERROR` if the URL is invalid.
 *
 * Checks:
 * - URL length (max 2048 characters)
 * - URL parsability
 * - Protocol (http/https only)
 * - Private IP / localhost rejection (SSRF protection)
 *
 * **Limitations:** This function validates the URL string only. It does not
 * perform DNS resolution, so hostnames that resolve to private IPs at
 * runtime (DNS rebinding) are not detected. For full SSRF protection in
 * production, combine this with network-level controls (e.g. egress
 * firewall rules or a DNS-resolving proxy).
 */
export function validateUrl(url: string): void {
  // Length check
  if (url.length > MAX_URL_LENGTH) {
    throw new EmbedError(
      "VALIDATION_ERROR",
      `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    );
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EmbedError("VALIDATION_ERROR", `Invalid URL: ${truncateUrl(url)}`);
  }

  // Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new EmbedError(
      "VALIDATION_ERROR",
      `Unsupported protocol: ${parsed.protocol} (only http and https are allowed)`,
    );
  }

  // Hostname check
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new EmbedError("VALIDATION_ERROR", "URLs pointing to localhost are not allowed");
  }

  // Strip IPv6 brackets
  const bare =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  // IPv6 loopback / private check
  if (BLOCKED_IPV6.has(bare)) {
    throw new EmbedError(
      "VALIDATION_ERROR",
      "URLs pointing to private or loopback addresses are not allowed",
    );
  }

  // IPv4-mapped IPv6 — handles both dotted (::ffff:127.0.0.1) and
  // hex (::ffff:7f00:1) forms that the URL parser may produce
  if (bare.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    const suffix = bare.slice(IPV4_MAPPED_IPV6_PREFIX.length);
    const ipv4 = parseIPv4FromMappedSuffix(suffix);
    if (ipv4 && isPrivateIPv4(ipv4)) {
      throw new EmbedError(
        "VALIDATION_ERROR",
        "URLs pointing to private or loopback addresses are not allowed",
      );
    }
  }

  // Numeric IP normalization (decimal integer, hex, octal)
  const normalized = normalizeNumericIPv4(hostname);
  if (normalized && isPrivateIPv4(normalized)) {
    throw new EmbedError(
      "VALIDATION_ERROR",
      "URLs pointing to private or loopback addresses are not allowed",
    );
  }

  // Standard dotted-decimal IPv4 private range check
  if (isPrivateIPv4(hostname)) {
    throw new EmbedError(
      "VALIDATION_ERROR",
      "URLs pointing to private or loopback addresses are not allowed",
    );
  }
}
