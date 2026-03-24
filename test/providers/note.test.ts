import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noteProvider } from "../../src/providers/index.js";

describe("NoteProvider", () => {
  const provider = noteProvider;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "rich",
            html: '<iframe class="note-embed" src="https://note.com/embed/notes/abc123" style="border: 0; display: block; max-width: 99%; width: 494px; padding: 0px; margin: 10px 0px; position: static; visibility: visible;" height="400"></iframe>',
            title: "テスト記事タイトル",
            author_name: "テストユーザー",
            author_url: "https://note.com/testuser",
            provider_name: "note",
            provider_url: "https://note.com",
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches note article URLs", () => {
    expect(provider.match("https://note.com/testuser/n/abc123")).toBe(true);
    expect(provider.match("https://www.note.com/testuser/n/abc123")).toBe(true);
    expect(provider.match("http://note.com/testuser/n/abc123")).toBe(true);
  });

  it("matches note magazine URLs", () => {
    expect(provider.match("https://note.com/testuser/m/abc123")).toBe(true);
    expect(provider.match("https://www.note.com/testuser/m/abc123")).toBe(true);
  });

  it("does not match unrelated URLs", () => {
    expect(provider.match("https://example.com/note")).toBe(false);
    expect(provider.match("https://note.com/")).toBe(false);
    expect(provider.match("https://notenot.com/user/n/abc")).toBe(false);
  });

  it("resolves a note article URL", async () => {
    const result = await provider.resolve("https://note.com/testuser/n/abc123");

    expect(result.provider).toBe("note");
    expect(result.type).toBe("rich");
    expect(result.html).toContain("note.com/embed");
    expect(result.title).toBe("テスト記事タイトル");
    expect(result.author_name).toBe("テストユーザー");
    expect(result.url).toBe("https://note.com/testuser/n/abc123");
  });

  it("passes maxWidth/maxHeight to the API", async () => {
    await provider.resolve("https://note.com/testuser/n/abc123", {
      maxWidth: 640,
      maxHeight: 480,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("maxwidth=640");
    expect(fetchCall).toContain("maxheight=480");
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(provider.resolve("https://note.com/testuser/n/notfound")).rejects.toThrow(
      "note oEmbed request failed: 404 Not Found",
    );
  });
});
