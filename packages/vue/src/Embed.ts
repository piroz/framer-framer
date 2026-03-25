import type { EmbedOptions, EmbedResult } from "framer-framer";
import { defineComponent, h, type PropType, type SlotsType } from "vue";
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
    const { result, loading, error } = useEmbed(() => props.url, {
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      embedOptions: props.options,
    });

    let lastEmittedUrl: string | null = null;
    let lastEmittedError: Error | null = null;

    return () => {
      if (loading.value) {
        return slots.loading ? slots.loading() : h("div", { class: "framer-framer-loading" });
      }

      if (error.value) {
        if (lastEmittedError !== error.value) {
          lastEmittedError = error.value;
          emit("error", error.value);
        }
        return slots.error
          ? slots.error({ error: error.value })
          : h("div", { class: "framer-framer-error" }, error.value.message);
      }

      if (result.value) {
        if (lastEmittedUrl !== result.value.url) {
          lastEmittedUrl = result.value.url;
          emit("load", result.value);
        }
        return slots.default
          ? slots.default({ result: result.value })
          : h("div", {
              class: "framer-framer-embed",
              innerHTML: result.value.html,
            });
      }

      return null;
    };
  },
});
