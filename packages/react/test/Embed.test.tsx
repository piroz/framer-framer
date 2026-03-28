import { render, screen, waitFor } from "@testing-library/react";
import { type EmbedResult, embed } from "framer-framer";
import { createRef } from "react";
import { vi } from "vitest";
import { Embed } from "../src/Embed.js";

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

describe("Embed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" />);

    expect(screen.getByTestId("framer-framer-skeleton")).toBeDefined();
  });

  it("renders embed HTML on success", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    render(<Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);

    await waitFor(() => {
      const container = screen.getByTestId("framer-framer-embed");
      expect(container.innerHTML).toContain("iframe");
    });
  });

  it("shows error state on failure", async () => {
    mockEmbed.mockRejectedValue(new Error("Failed to resolve"));
    render(<Embed url="https://invalid.example.com" />);

    await waitFor(() => {
      expect(screen.getByTestId("framer-framer-error")).toBeDefined();
    });

    expect(screen.getByText("Failed to resolve")).toBeDefined();
  });

  it("calls onLoad callback on success", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const onLoad = vi.fn();
    render(<Embed url="https://example.com" onLoad={onLoad} />);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledWith(mockResult);
    });
  });

  it("calls onError callback on failure", async () => {
    const error = new Error("Network error");
    mockEmbed.mockRejectedValue(error);
    const onError = vi.fn();
    render(<Embed url="https://example.com" onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it("forwards ref to container div", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    const ref = createRef<HTMLDivElement>();
    render(<Embed url="https://example.com" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes maxWidth and maxHeight to embed options", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    render(<Embed url="https://example.com" maxWidth={600} maxHeight={400} />);

    await waitFor(() => {
      expect(mockEmbed).toHaveBeenCalledWith("https://example.com", {
        maxWidth: 600,
        maxHeight: 400,
      });
    });
  });

  it("applies className and style to container", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" className="my-embed" style={{ margin: 10 }} />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.className).toBe("my-embed");
    expect(container.style.margin).toBe("10px");
  });

  it("renders custom loading fallback", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" loadingFallback={<span>Custom loading</span>} />);

    expect(screen.getByText("Custom loading")).toBeDefined();
  });

  it("renders custom error fallback as ReactNode", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    render(<Embed url="https://example.com" errorFallback={<span>Custom error</span>} />);

    await waitFor(() => {
      expect(screen.getByText("Custom error")).toBeDefined();
    });
  });

  it("renders custom error fallback as function", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    render(
      <Embed
        url="https://example.com"
        errorFallback={(err) => <span>Error: {err.message}</span>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Error: fail")).toBeDefined();
    });
  });

  it("applies maxWidth constraint to container style", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" maxWidth={500} />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.style.maxWidth).toBe("500px");
  });

  it("sets data-framer-theme to auto by default", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.getAttribute("data-framer-theme")).toBe("auto");
  });

  it("sets data-framer-theme to dark when theme prop is dark", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" theme="dark" />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.getAttribute("data-framer-theme")).toBe("dark");
  });

  it("sets data-framer-theme to light when theme prop is light", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" theme="light" />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.getAttribute("data-framer-theme")).toBe("light");
  });

  it("injects theme CSS style tag", () => {
    mockEmbed.mockReturnValue(new Promise(() => {}));
    render(<Embed url="https://example.com" />);

    const container = screen.getByTestId("framer-framer-embed");
    const styleTag = container.querySelector("style#framer-framer-theme");
    expect(styleTag).toBeDefined();
    expect(styleTag?.textContent).toContain("--framer-skeleton-bg");
  });

  it("applies theme attribute in error state", async () => {
    mockEmbed.mockRejectedValue(new Error("fail"));
    render(<Embed url="https://example.com" theme="dark" />);

    await waitFor(() => {
      const container = screen.getByTestId("framer-framer-embed");
      expect(container.getAttribute("data-framer-theme")).toBe("dark");
    });
  });

  it("applies theme attribute in success state", async () => {
    mockEmbed.mockResolvedValue(mockResult);
    render(<Embed url="https://example.com" theme="dark" />);

    await waitFor(() => {
      const container = screen.getByTestId("framer-framer-embed");
      expect(container.getAttribute("data-framer-theme")).toBe("dark");
    });
  });

  it("renders immediately with initialData without fetching", () => {
    render(<Embed url="https://example.com" initialData={mockResult} />);

    const container = screen.getByTestId("framer-framer-embed");
    expect(container.innerHTML).toContain("iframe");
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("calls onLoad with initialData", async () => {
    const onLoad = vi.fn();
    render(<Embed url="https://example.com" initialData={mockResult} onLoad={onLoad} />);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledWith(mockResult);
    });
  });
});
