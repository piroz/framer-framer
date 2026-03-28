import { renderHook, waitFor } from "@testing-library/react";
import { type EmbedResult, embed } from "framer-framer";
import { vi } from "vitest";
import { useEmbed } from "../src/useEmbed.js";

const mockGetProviderInfo = vi.fn();

vi.mock("framer-framer", () => ({
  embed: vi.fn(),
  getProviderInfo: (...args: unknown[]) => mockGetProviderInfo(...args),
}));

const mockEmbed = vi.mocked(embed);

const mockResult: EmbedResult = {
  type: "video",
  html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
  provider: "youtube",
  title: "Test Video",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

describe("useEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEmbed("https://example.com"));
    expect(result.current.status).toBe("loading");
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("resolves to success state", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"));

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.data).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it("resolves to error state on failure", async () => {
    mockEmbed.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useEmbed("https://invalid.example.com"));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Network error");
  });

  it("passes options to embed()", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    renderHook(() => useEmbed("https://example.com", { maxWidth: 600 }));

    await waitFor(() => {
      expect(mockEmbed).toHaveBeenCalledWith("https://example.com", { maxWidth: 600 });
    });
  });

  it("re-fetches when url changes", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const { result, rerender } = renderHook(({ url }) => useEmbed(url), {
      initialProps: { url: "https://example.com/1" },
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    rerender({ url: "https://example.com/2" });

    await waitFor(() => {
      expect(mockEmbed).toHaveBeenCalledTimes(2);
    });
  });

  it("handles non-Error rejection", async () => {
    mockEmbed.mockRejectedValue("string error");
    const { result } = renderHook(() => useEmbed("https://example.com"));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error?.message).toBe("string error");
  });

  it("uses initialData and skips fetch", () => {
    const { result } = renderHook(() =>
      useEmbed("https://example.com", { initialData: mockResult }),
    );

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(mockResult);
    expect(result.current.error).toBeNull();
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("does not re-fetch when initialData is provided", async () => {
    const { result } = renderHook(() =>
      useEmbed("https://example.com", { initialData: mockResult }),
    );

    // Wait a tick to ensure no async fetch is triggered
    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.status).toBe("success");
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("returns providerAspectRatio from matched provider", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    mockGetProviderInfo.mockReturnValue({
      name: "youtube",
      patterns: [],
      defaultAspectRatio: "16:9",
    });
    const { result } = renderHook(() => useEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"));

    expect(result.current.providerAspectRatio).toBe("16:9");
  });

  it("returns undefined providerAspectRatio for unknown URL", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    mockGetProviderInfo.mockReturnValue(undefined);
    const { result } = renderHook(() => useEmbed("https://unknown.example.com"));

    expect(result.current.providerAspectRatio).toBeUndefined();
  });
});
