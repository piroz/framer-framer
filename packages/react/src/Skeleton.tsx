import type { CSSProperties } from "react";

export interface SkeletonProps {
  /** Aspect ratio string (e.g. '16:9', '1:1') to maintain placeholder dimensions */
  aspectRatio?: string;
  /** Max width in pixels */
  maxWidth?: number;
}

const containerStyle: CSSProperties = {
  backgroundColor: "var(--framer-skeleton-bg, #e5e7eb)",
  borderRadius: 8,
  overflow: "hidden",
  position: "relative",
  width: "100%",
  animation: "framer-framer-pulse 1.5s ease-in-out infinite",
};

const keyframesStyle = `
@keyframes framer-framer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}`;

function parseAspectRatio(ratio?: string): number | undefined {
  if (!ratio) return undefined;
  const [w, h] = ratio.split(":").map(Number);
  if (w && h && w > 0 && h > 0) return h / w;
  return undefined;
}

export function Skeleton({ aspectRatio, maxWidth }: SkeletonProps) {
  const ratio = parseAspectRatio(aspectRatio);

  const style: CSSProperties = {
    ...containerStyle,
    ...(maxWidth ? { maxWidth } : {}),
    ...(ratio ? { aspectRatio: `${1 / ratio}` } : { height: 200 }),
  };

  return (
    <>
      <style>{keyframesStyle}</style>
      <div style={style} data-testid="framer-framer-skeleton" />
    </>
  );
}
