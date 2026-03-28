import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEmbed, getEmbedBatch } from "../src/helpers.js";

const mockEmbed = vi.fn();
const mockEmbedBatch = vi.fn();

vi.mock("framer-framer", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
  embedBatch: (...args: unknown[]) => mockEmbedBatch(...args),
}));

const mockResult = {
  type: "video" as const,
  html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
  provider: "youtube",
  title: "Test Video",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

describe("getEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a URL and returns data", async () => {
    mockEmbed.mockResolvedValue(mockResult);

    const result = await getEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(result.data).toEqual(mockResult);
    expect(result.error).toBeNull();
    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("returns error on failure", async () => {
    mockEmbed.mockRejectedValue(new Error("Network error"));

    const result = await getEmbed("https://example.com/bad");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("Network error");
  });

  it("handles non-Error rejection", async () => {
    mockEmbed.mockRejectedValue("string error");

    const result = await getEmbed("https://example.com/bad");

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("string error");
  });

  it("passes maxWidth and maxHeight options", async () => {
    mockEmbed.mockResolvedValue(mockResult);

    await getEmbed("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=test", {
      maxWidth: 640,
      maxHeight: 480,
    });
  });

  it("passes embedOptions through", async () => {
    mockEmbed.mockResolvedValue(mockResult);

    await getEmbed("https://www.youtube.com/watch?v=test", {
      embedOptions: { timeout: 5000 },
    });

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=test", {
      timeout: 5000,
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });
});

describe("getEmbedBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves multiple URLs", async () => {
    const result2 = { ...mockResult, provider: "vimeo", url: "https://vimeo.com/123" };
    mockEmbedBatch.mockResolvedValue([mockResult, result2]);

    const results = await getEmbedBatch([
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/123",
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].data).toEqual(mockResult);
    expect(results[0].error).toBeNull();
    expect(results[1].data).toEqual(result2);
    expect(results[1].error).toBeNull();
  });

  it("handles mixed success and error results", async () => {
    const err = new Error("Failed");
    mockEmbedBatch.mockResolvedValue([mockResult, err]);

    const results = await getEmbedBatch([
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://example.com/bad",
    ]);

    expect(results[0].data).toEqual(mockResult);
    expect(results[0].error).toBeNull();
    expect(results[1].data).toBeNull();
    expect(results[1].error).toBe(err);
  });

  it("passes concurrency option", async () => {
    mockEmbedBatch.mockResolvedValue([]);

    await getEmbedBatch([], { concurrency: 3 });

    expect(mockEmbedBatch).toHaveBeenCalledWith([], {
      maxWidth: undefined,
      maxHeight: undefined,
      concurrency: 3,
    });
  });

  it("passes embedOptions through", async () => {
    mockEmbedBatch.mockResolvedValue([]);

    await getEmbedBatch([], {
      embedOptions: { timeout: 5000 },
      maxWidth: 800,
    });

    expect(mockEmbedBatch).toHaveBeenCalledWith([], {
      timeout: 5000,
      maxWidth: 800,
      maxHeight: undefined,
      concurrency: undefined,
    });
  });
});
