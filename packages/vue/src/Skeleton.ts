import type { CSSProperties, PropType } from "vue";
import { defineComponent, h } from "vue";

function parseAspectRatio(ratio?: string): number | undefined {
  if (!ratio) return undefined;
  const [w, h] = ratio.split(":").map(Number);
  if (w && h && w > 0 && h > 0) return h / w;
  return undefined;
}

const keyframesStyle = `
@keyframes framer-framer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}`;

const containerStyle: CSSProperties = {
  backgroundColor: "var(--framer-skeleton-bg, #e5e7eb)",
  borderRadius: "8px",
  overflow: "hidden",
  position: "relative",
  width: "100%",
  animation: "framer-framer-pulse 1.5s ease-in-out infinite",
};

export const Skeleton = defineComponent({
  name: "Skeleton",
  props: {
    aspectRatio: {
      type: String as PropType<string>,
      default: undefined,
    },
    maxWidth: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const ratio = parseAspectRatio(props.aspectRatio);
      const style: CSSProperties = {
        ...containerStyle,
        ...(props.maxWidth ? { maxWidth: `${props.maxWidth}px` } : {}),
        ...(ratio ? { aspectRatio: `${1 / ratio}` } : { height: "200px" }),
      };

      return h("div", null, [
        h("style", null, keyframesStyle),
        h("div", { style, "data-testid": "framer-framer-skeleton" }),
      ]);
    };
  },
});
