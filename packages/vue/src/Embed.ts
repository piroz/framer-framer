import type { EmbedOptions, EmbedResult } from "framer-framer";
import { defineComponent, h, type PropType, type SlotsType } from "vue";
import { Skeleton } from "./Skeleton.js";
import type { Theme } from "./theme.js";
import { themeCSS, themeStyleId } from "./theme.js";
import { useEmbed } from "./useEmbed.js";

export const Embed = defineComponent({
  name: "Embed",
  props: {
    url: {
      type: String,
      required: true,
    },
    maxWidth: {
      type: Number,
      default: undefined,
    },
    maxHeight: {
      type: Number,
      default: undefined,
    },
    options: {
      type: Object as PropType<EmbedOptions>,
      default: undefined,
    },
    theme: {
      type: String as PropType<Theme>,
      default: "auto",
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
  },
  emits: {
    load: (_result: EmbedResult) => true,
    error: (_error: Error) => true,
  },
  slots: Object as SlotsType<{
    default?: { result: EmbedResult };
    loading?: Record<string, never>;
    error?: { error: Error };
  }>,
  setup(props, { emit, slots }) {
    const { result, loading, error, providerAspectRatio } = useEmbed(() => props.url, {
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      embedOptions: props.options,
    });

    let lastEmittedUrl: string | null = null;
    let lastEmittedError: Error | null = null;

    return () => {
      const themeStyle = h("style", { id: themeStyleId }, themeCSS);
      const themeAttr = props.theme ?? "auto";

      if (loading.value) {
        const loadingContent = slots.loading
          ? slots.loading()
          : h(Skeleton, { aspectRatio: providerAspectRatio.value, maxWidth: props.maxWidth });
        return h("div", { "data-framer-theme": themeAttr, "aria-busy": "true" }, [
          themeStyle,
          loadingContent,
        ]);
      }

      if (error.value) {
        if (lastEmittedError !== error.value) {
          lastEmittedError = error.value;
          emit("error", error.value);
        }
        const errorContent = slots.error
          ? slots.error({ error: error.value })
          : h("div", { class: "framer-framer-error" }, error.value.message);
        return h("div", { "data-framer-theme": themeAttr }, [themeStyle, errorContent]);
      }

      if (result.value) {
        if (lastEmittedUrl !== result.value.url) {
          lastEmittedUrl = result.value.url;
          emit("load", result.value);
        }
        const effectiveAriaLabel =
          props.ariaLabel ??
          `${result.value.provider}${result.value.title ? `: ${result.value.title}` : ""}`;
        if (slots.default) {
          return h(
            "div",
            { "data-framer-theme": themeAttr, role: "region", "aria-label": effectiveAriaLabel },
            [themeStyle, slots.default({ result: result.value })],
          );
        }
        return h(
          "div",
          { "data-framer-theme": themeAttr, role: "region", "aria-label": effectiveAriaLabel },
          [
            themeStyle,
            h("div", {
              class: "framer-framer-embed",
              innerHTML: result.value.html,
            }),
          ],
        );
      }

      return null;
    };
  },
});
