import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { Embed } from "../src/Embed.js";

const mockEmbed = vi.fn();

vi.mock("framer-framer", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

const mockResult = {
  type: "video" as const,
  html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
  provider: "youtube",
  title: "Test Video",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

describe("Embed component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockEmbed.mockReturnValue(new Promise(() => {})); // never resolves
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    expect(wrapper.find(".framer-framer-loading").exists()).toBe(true);
  });

  it("renders embed HTML on success", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    await flushPromises();

    expect(wrapper.find(".framer-framer-embed").exists()).toBe(true);
    expect(wrapper.find(".framer-framer-embed").html()).toContain("iframe");
  });

  it("renders error state on failure", async () => {
    mockEmbed.mockRejectedValue(new Error("Failed to resolve"));
    const wrapper = mount(Embed, {
      props: { url: "https://example.com/bad" },
    });

    await flushPromises();

    expect(wrapper.find(".framer-framer-error").exists()).toBe(true);
    expect(wrapper.find(".framer-framer-error").text()).toBe("Failed to resolve");
  });

  it("emits load event on success", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    await flushPromises();

    expect(wrapper.emitted("load")).toBeTruthy();
    expect(wrapper.emitted("load")?.[0]).toEqual([mockResult]);
  });

  it("emits error event on failure", async () => {
    const err = new Error("Network error");
    mockEmbed.mockRejectedValue(err);
    const wrapper = mount(Embed, {
      props: { url: "https://example.com/bad" },
    });

    await flushPromises();

    expect(wrapper.emitted("error")).toBeTruthy();
    expect(wrapper.emitted("error")?.[0]).toEqual([err]);
  });

  it("renders custom loading slot", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      slots: {
        loading: () => h("div", { class: "custom-loader" }, "Loading..."),
      },
    });

    expect(wrapper.find(".custom-loader").exists()).toBe(true);
    expect(wrapper.find(".custom-loader").text()).toBe("Loading...");
  });

  it("renders custom error slot", async () => {
    mockEmbed.mockRejectedValue(new Error("Oops"));
    const wrapper = mount(Embed, {
      props: { url: "https://example.com/bad" },
      slots: {
        error: (props: { error: Error }) =>
          h("div", { class: "custom-error" }, props.error.message),
      },
    });

    await flushPromises();

    expect(wrapper.find(".custom-error").exists()).toBe(true);
    expect(wrapper.find(".custom-error").text()).toBe("Oops");
  });

  it("renders custom default slot with result", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      slots: {
        default: (props: { result: typeof mockResult }) =>
          h("div", { class: "custom-embed" }, props.result.title),
      },
    });

    await flushPromises();

    expect(wrapper.find(".custom-embed").exists()).toBe(true);
    expect(wrapper.find(".custom-embed").text()).toBe("Test Video");
  });

  it("passes maxWidth and maxHeight props", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    mount(Embed, {
      props: {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        maxWidth: 640,
        maxHeight: 480,
      },
    });

    await flushPromises();

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      maxWidth: 640,
      maxHeight: 480,
    });
  });

  it("sets data-framer-theme to auto by default", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    expect(wrapper.find("[data-framer-theme='auto']").exists()).toBe(true);
  });

  it("sets data-framer-theme to dark when theme prop is dark", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", theme: "dark" },
    });

    expect(wrapper.find("[data-framer-theme='dark']").exists()).toBe(true);
  });

  it("sets data-framer-theme to light when theme prop is light", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", theme: "light" },
    });

    expect(wrapper.find("[data-framer-theme='light']").exists()).toBe(true);
  });

  it("injects theme CSS style tag", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    const styleTag = wrapper.find("style#framer-framer-theme");
    expect(styleTag.exists()).toBe(true);
    expect(styleTag.text()).toContain("--framer-skeleton-bg");
  });

  it("applies theme attribute in error state", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    const wrapper = mount(Embed, {
      props: { url: "https://example.com/bad", theme: "dark" },
    });

    await flushPromises();

    expect(wrapper.find("[data-framer-theme='dark']").exists()).toBe(true);
  });

  it("applies theme attribute in success state", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const wrapper = mount(Embed, {
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", theme: "dark" },
    });

    await flushPromises();

    expect(wrapper.find("[data-framer-theme='dark']").exists()).toBe(true);
  });

  it("re-renders when url prop changes", async () => {
    const result2 = { ...mockResult, provider: "vimeo", url: "https://vimeo.com/123" };
    mockEmbed.mockResolvedValueOnce(mockResult).mockResolvedValueOnce(result2);

    const wrapper = mount(
      defineComponent({
        data() {
          return { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
        },
        render() {
          return h(Embed, { url: this.url });
        },
      }),
    );

    await flushPromises();
    expect(wrapper.find(".framer-framer-embed").html()).toContain("iframe");

    await wrapper.setData({ url: "https://vimeo.com/123" });
    await nextTick();
    await flushPromises();

    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });
});
