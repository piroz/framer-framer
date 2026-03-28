/** Theme mode for Embed components */
export type Theme = "light" | "dark" | "auto";

/**
 * CSS custom properties for light and dark themes.
 * Injected once via a <style> tag to avoid duplication.
 */
export const themeStyleId = "framer-framer-theme";

export const themeCSS = `
[data-framer-theme="light"] {
  --framer-bg: #ffffff;
  --framer-border: #e5e7eb;
  --framer-skeleton-bg: #e5e7eb;
  --framer-error-bg: #fef2f2;
  --framer-error-border: #fca5a5;
  --framer-error-text: #991b1b;
}

[data-framer-theme="dark"] {
  --framer-bg: #1f2937;
  --framer-border: #374151;
  --framer-skeleton-bg: #374151;
  --framer-error-bg: #451a1a;
  --framer-error-border: #991b1b;
  --framer-error-text: #fca5a5;
}

[data-framer-theme="auto"] {
  --framer-bg: #ffffff;
  --framer-border: #e5e7eb;
  --framer-skeleton-bg: #e5e7eb;
  --framer-error-bg: #fef2f2;
  --framer-error-border: #fca5a5;
  --framer-error-text: #991b1b;
}

@media (prefers-color-scheme: dark) {
  [data-framer-theme="auto"] {
    --framer-bg: #1f2937;
    --framer-border: #374151;
    --framer-skeleton-bg: #374151;
    --framer-error-bg: #451a1a;
    --framer-error-border: #991b1b;
    --framer-error-text: #fca5a5;
  }
}`;
