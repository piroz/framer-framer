import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const mockEmbed = vi.fn();
const mockUseAsyncData = vi.fn();

vi.mock("framer-framer", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

vi.mock("nuxt/app", () => ({
  useAsyncData: (...args: unknown[]) => mockUseAsyncData(...args),
}));

// Import after mocks are set up
const { useNuxtEmbed } = await import("../../src/nuxt/useNuxtEmbed.js");

describe("useNuxtEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref("pending"),
      error: ref(null),
      refresh: vi.fn(),
      execute: vi.fn(),
      pending: ref(true),
    });
  });

  it("calls useAsyncData with the correct key based on the URL", () => {
    useNuxtEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(mockUseAsyncData).toHaveBeenCalledWith(
      "framer-framer:https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      expect.any(Function),
      expect.objectContaining({
        lazy: false,
        watch: [expect.any(Function)],
      }),
    );
  });

  it("resolves the URL via embed() in the handler", async () => {
    const mockResult = {
      type: "video" as const,
      html: "<iframe></iframe>",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
    mockEmbed.mockResolvedValue(mockResult);

    useNuxtEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // Extract and execute the handler passed to useAsyncData
    const handler = mockUseAsyncData.mock.calls[0][1];
    const result = await handler();

    expect(result).toEqual(mockResult);
    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("passes maxWidth and maxHeight to embed()", async () => {
    mockEmbed.mockResolvedValue({ type: "video", html: "<iframe></iframe>" });

    useNuxtEmbed("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });

    const handler = mockUseAsyncData.mock.calls[0][1];
    await handler();

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });
  });

  it("passes embedOptions to embed()", async () => {
    mockEmbed.mockResolvedValue({ type: "video", html: "<iframe></iframe>" });

    useNuxtEmbed("https://www.youtube.com/watch?v=test", {
      embedOptions: { timeout: 5000 },
    });

    const handler = mockUseAsyncData.mock.calls[0][1];
    await handler();

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=test", {
      timeout: 5000,
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("returns null for empty URL in the handler", async () => {
    useNuxtEmbed("");

    const handler = mockUseAsyncData.mock.calls[0][1];
    const result = await handler();

    expect(result).toBeNull();
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("sets lazy: false by default", () => {
    useNuxtEmbed("https://example.com");

    const options = mockUseAsyncData.mock.calls[0][2];
    expect(options.lazy).toBe(false);
  });

  it("sets lazy: true when specified", () => {
    useNuxtEmbed("https://example.com", { lazy: true });

    const options = mockUseAsyncData.mock.calls[0][2];
    expect(options.lazy).toBe(true);
  });

  it("includes a watch source for reactive URL changes", () => {
    const url = ref("https://example.com");
    useNuxtEmbed(url);

    const options = mockUseAsyncData.mock.calls[0][2];
    expect(options.watch).toHaveLength(1);
    expect(typeof options.watch[0]).toBe("function");
    // The watch source should return the current URL value
    expect(options.watch[0]()).toBe("https://example.com");
  });

  it("watch source tracks reactive URL ref changes", () => {
    const url = ref("https://example.com/first");
    useNuxtEmbed(url);

    const watchSource = mockUseAsyncData.mock.calls[0][2].watch[0];
    expect(watchSource()).toBe("https://example.com/first");

    url.value = "https://example.com/second";
    expect(watchSource()).toBe("https://example.com/second");
  });

  it("handler reads the current reactive URL value", async () => {
    mockEmbed.mockResolvedValue({ type: "video", html: "<iframe></iframe>" });

    const url = ref("https://example.com/first");
    useNuxtEmbed(url);

    const handler = mockUseAsyncData.mock.calls[0][1];

    // Change URL before handler executes (simulates watch-triggered re-fetch)
    url.value = "https://example.com/second";
    await handler();

    expect(mockEmbed).toHaveBeenCalledWith("https://example.com/second", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("returns the useAsyncData result directly", () => {
    const mockReturn = {
      data: ref({ html: "<iframe></iframe>" }),
      status: ref("success"),
      error: ref(null),
      refresh: vi.fn(),
      execute: vi.fn(),
      pending: ref(false),
    };
    mockUseAsyncData.mockReturnValue(mockReturn);

    const result = useNuxtEmbed("https://example.com");

    expect(result).toBe(mockReturn);
  });

  it("accepts a getter function as URL", async () => {
    mockEmbed.mockResolvedValue({ type: "video", html: "<iframe></iframe>" });

    let currentUrl = "https://example.com/getter";
    useNuxtEmbed(() => currentUrl);

    expect(mockUseAsyncData).toHaveBeenCalledWith(
      "framer-framer:https://example.com/getter",
      expect.any(Function),
      expect.any(Object),
    );

    const handler = mockUseAsyncData.mock.calls[0][1];
    currentUrl = "https://example.com/updated";
    await handler();

    expect(mockEmbed).toHaveBeenCalledWith("https://example.com/updated", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });
});
