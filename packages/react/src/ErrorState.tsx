import type { CSSProperties } from "react";

export interface ErrorStateProps {
  error: Error;
}

const style: CSSProperties = {
  padding: 16,
  border: "1px solid var(--framer-error-border, #fca5a5)",
  borderRadius: 8,
  backgroundColor: "var(--framer-error-bg, #fef2f2)",
  color: "var(--framer-error-text, #991b1b)",
  fontSize: 14,
};

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div style={style} role="alert" data-testid="framer-framer-error">
      <strong>Embed failed:</strong> {error.message}
    </div>
  );
}
