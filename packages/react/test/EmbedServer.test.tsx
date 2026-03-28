import { type EmbedResult, embed } from "framer-framer";
import { vi } from "vitest";
import { EmbedServer } from "../src/EmbedServer.js";

vi.mock("framer-framer", () => ({
  embed: vi.fn(),
}));

const mockEmbed = vi.mocked(embed);

const mockResult: EmbedResult = {
  type: "video",
  html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
  provider: "youtube",
  title: "Test Video",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

describe("EmbedServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders embed HTML on success", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const element = await EmbedServer({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });

    expect(mockEmbed).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      maxWidth: undefined,
      maxHeight: undefined,
    });
    expect(element).toBeTruthy();
    const props = (element as React.ReactElement).props;
    expect(props["data-testid"]).toBe("framer-framer-embed");
    expect(props["data-framer-theme"]).toBe("auto");
  });

  it("renders error state on failure", async () => {
    mockEmbed.mockRejectedValue(new Error("Network error"));
    const element = await EmbedServer({ url: "https://invalid.example.com" });

    expect(element).toBeTruthy();
    const props = (element as React.ReactElement).props;
    expect(props["data-testid"]).toBe("framer-framer-embed");
  });

  it("renders custom error fallback as ReactNode", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    const element = await EmbedServer({
      url: "https://example.com",
      errorFallback: <span>Custom error</span>,
    });

    expect(element).toBeTruthy();
  });

  it("renders custom error fallback as function", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    const element = await EmbedServer({
      url: "https://example.com",
      errorFallback: (err) => <span>Error: {err.message}</span>,
    });

    expect(element).toBeTruthy();
  });

  it("passes maxWidth and maxHeight to embed options", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    await EmbedServer({ url: "https://example.com", maxWidth: 600, maxHeight: 400 });

    expect(mockEmbed).toHaveBeenCalledWith("https://example.com", {
      maxWidth: 600,
      maxHeight: 400,
    });
  });

  it("passes embedOptions to embed", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    await EmbedServer({
      url: "https://example.com",
      embedOptions: { timeout: 5000 },
    });

    expect(mockEmbed).toHaveBeenCalledWith("https://example.com", {
      timeout: 5000,
      maxWidth: undefined,
      maxHeight: undefined,
    });
  });

  it("applies className and style", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const element = await EmbedServer({
      url: "https://example.com",
      className: "my-embed",
      style: { margin: 10 },
    });

    const props = (element as React.ReactElement).props;
    expect(props.className).toBe("my-embed");
    expect(props.style).toEqual({ margin: 10 });
  });

  it("applies maxWidth to container style", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const element = await EmbedServer({
      url: "https://example.com",
      maxWidth: 500,
    });

    const props = (element as React.ReactElement).props;
    expect(props.style).toEqual({ maxWidth: 500 });
  });

  it("sets theme attribute", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const element = await EmbedServer({
      url: "https://example.com",
      theme: "dark",
    });

    const props = (element as React.ReactElement).props;
    expect(props["data-framer-theme"]).toBe("dark");
  });

  it("handles non-Error rejection", async () => {
    mockEmbed.mockRejectedValue("string error");
    const element = await EmbedServer({ url: "https://example.com" });

    expect(element).toBeTruthy();
    const props = (element as React.ReactElement).props;
    expect(props["data-testid"]).toBe("framer-framer-embed");
  });
});
