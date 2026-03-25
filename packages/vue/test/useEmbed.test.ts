import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useEmbed } from "../src/useEmbed.js";

const mockEmbed = vi.fn();

vi.mock("framer-framer", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

describe("useEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a URL and returns the result", async () => {
    const mockResult = {
      type: "video" as const,
      html: "<iframe></iframe>",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
    mockEmbed.mockResolvedValue(mockResult);

    const { result, loading, error } = useEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(loading.value).toBe(true);
    expect(result.value).toBeNull();

    await vi.waitFor(() => {
      expect(loading.value).toBe(false);
    });

    expect(result.value).toEqual(mockResult);
    expect(error.value).toBeNull();
    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("handles errors", async () => {
    mockEmbed.mockRejectedValue(new Error("Network error"));

    const { result, loading, error } = useEmbed("https://example.com/bad");

    await vi.waitFor(() => {
      expect(loading.value).toBe(false);
    });

    expect(result.value).toBeNull();
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("Network error");
  });

  it("passes maxWidth and maxHeight options", async () => {
    mockEmbed.mockResolvedValue({
      type: "video",
      html: "<iframe></iframe>",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=test",
    });

    useEmbed("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });

    await vi.waitFor(() => {
      expect(mockEmbed).toHaveBeenCalled();
    });

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });
  });

  it("re-resolves when URL changes (reactive ref)", async () => {
    const result1 = {
      type: "video" as const,
      html: "<iframe>1</iframe>",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=1",
    };
    const result2 = {
      type: "video" as const,
      html: "<iframe>2</iframe>",
      provider: "vimeo",
      url: "https://vimeo.com/123",
    };
    mockEmbed.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

    const url = ref("https://www.youtube.com/watch?v=1");
    const { result } = useEmbed(url);

    await vi.waitFor(() => {
      expect(result.value).toEqual(result1);
    });

    url.value = "https://vimeo.com/123";
    await nextTick();

    await vi.waitFor(() => {
      expect(result.value).toEqual(result2);
    });
  });

  it("handles empty URL", async () => {
    const { result, loading, error } = useEmbed("");

    await vi.waitFor(() => {
      expect(loading.value).toBe(false);
    });

    expect(result.value).toBeNull();
    expect(error.value).toBeNull();
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("handles non-Error rejection", async () => {
    mockEmbed.mockRejectedValue("string error");

    const { error } = useEmbed("https://example.com");

    await vi.waitFor(() => {
      expect(error.value).not.toBeNull();
    });

    expect(error.value?.message).toBe("string error");
  });
});
