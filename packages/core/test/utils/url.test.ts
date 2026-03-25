import { describe, expect, it } from "vitest";
import { EmbedError } from "../../src/errors.js";
import { validateUrl } from "../../src/utils/url.js";

describe("validateUrl", () => {
  describe("valid URLs", () => {
    it("accepts http URLs", () => {
      expect(() => validateUrl("http://example.com")).not.toThrow();
    });

    it("accepts https URLs", () => {
      expect(() => validateUrl("https://example.com")).not.toThrow();
    });

    it("accepts URLs with paths and query strings", () => {
      expect(() => validateUrl("https://example.com/path?q=1&b=2#hash")).not.toThrow();
    });

    it("accepts URLs with ports", () => {
      expect(() => validateUrl("https://example.com:8080/path")).not.toThrow();
    });
  });

  describe("invalid URLs", () => {
    it("rejects non-URL strings", () => {
      expect(() => validateUrl("not a url")).toThrow(EmbedError);
      expect(() => validateUrl("not a url")).toThrow(/Invalid URL/);
    });

    it("rejects empty strings", () => {
      expect(() => validateUrl("")).toThrow(EmbedError);
    });
  });

  describe("protocol restrictions", () => {
    it("rejects ftp protocol", () => {
      expect(() => validateUrl("ftp://example.com")).toThrow(EmbedError);
      expect(() => validateUrl("ftp://example.com")).toThrow(/Unsupported protocol/);
    });

    it("rejects javascript protocol", () => {
      expect(() => validateUrl("javascript:alert(1)")).toThrow(EmbedError);
    });

    it("rejects data protocol", () => {
      expect(() => validateUrl("data:text/html,<h1>hi</h1>")).toThrow(EmbedError);
    });

    it("rejects file protocol", () => {
      expect(() => validateUrl("file:///etc/passwd")).toThrow(EmbedError);
    });
  });

  describe("SSRF protection — private IPs", () => {
    it("rejects localhost", () => {
      expect(() => validateUrl("http://localhost")).toThrow(EmbedError);
      expect(() => validateUrl("http://localhost")).toThrow(/localhost/);
    });

    it("rejects localhost with port", () => {
      expect(() => validateUrl("http://localhost:3000")).toThrow(EmbedError);
    });

    it("rejects 127.0.0.1 (loopback)", () => {
      expect(() => validateUrl("http://127.0.0.1")).toThrow(EmbedError);
      expect(() => validateUrl("http://127.0.0.1")).toThrow(/private or loopback/);
    });

    it("rejects 127.x.x.x range", () => {
      expect(() => validateUrl("http://127.0.0.2")).toThrow(EmbedError);
      expect(() => validateUrl("http://127.255.255.255")).toThrow(EmbedError);
    });

    it("rejects 10.x.x.x range", () => {
      expect(() => validateUrl("http://10.0.0.1")).toThrow(EmbedError);
      expect(() => validateUrl("http://10.255.255.255")).toThrow(EmbedError);
    });

    it("rejects 172.16.x.x — 172.31.x.x range", () => {
      expect(() => validateUrl("http://172.16.0.1")).toThrow(EmbedError);
      expect(() => validateUrl("http://172.31.255.255")).toThrow(EmbedError);
    });

    it("allows 172.15.x.x (not private)", () => {
      expect(() => validateUrl("http://172.15.0.1")).not.toThrow();
    });

    it("allows 172.32.x.x (not private)", () => {
      expect(() => validateUrl("http://172.32.0.1")).not.toThrow();
    });

    it("rejects 192.168.x.x range", () => {
      expect(() => validateUrl("http://192.168.0.1")).toThrow(EmbedError);
      expect(() => validateUrl("http://192.168.1.100")).toThrow(EmbedError);
    });

    it("rejects 169.254.x.x (link-local)", () => {
      expect(() => validateUrl("http://169.254.0.1")).toThrow(EmbedError);
    });

    it("rejects 0.0.0.0", () => {
      expect(() => validateUrl("http://0.0.0.0")).toThrow(EmbedError);
    });

    it("rejects IPv6 loopback [::1]", () => {
      expect(() => validateUrl("http://[::1]")).toThrow(EmbedError);
    });

    it("rejects IPv6 unspecified [::]", () => {
      expect(() => validateUrl("http://[::]")).toThrow(EmbedError);
    });
  });

  describe("SSRF protection — IPv4-mapped IPv6", () => {
    it("rejects [::ffff:127.0.0.1]", () => {
      expect(() => validateUrl("http://[::ffff:127.0.0.1]")).toThrow(EmbedError);
    });

    it("rejects [::ffff:10.0.0.1]", () => {
      expect(() => validateUrl("http://[::ffff:10.0.0.1]")).toThrow(EmbedError);
    });

    it("rejects [::ffff:192.168.1.1]", () => {
      expect(() => validateUrl("http://[::ffff:192.168.1.1]")).toThrow(EmbedError);
    });

    it("rejects [::ffff:172.16.0.1]", () => {
      expect(() => validateUrl("http://[::ffff:172.16.0.1]")).toThrow(EmbedError);
    });

    it("allows [::ffff:8.8.8.8] (public IP)", () => {
      expect(() => validateUrl("http://[::ffff:8.8.8.8]")).not.toThrow();
    });
  });

  describe("SSRF protection — numeric IP representations", () => {
    it("rejects decimal IP for 127.0.0.1 (2130706433)", () => {
      expect(() => validateUrl("http://2130706433")).toThrow(EmbedError);
    });

    it("rejects hex IP for 127.0.0.1 (0x7f000001)", () => {
      expect(() => validateUrl("http://0x7f000001")).toThrow(EmbedError);
    });

    it("rejects decimal IP for 10.0.0.1 (167772161)", () => {
      expect(() => validateUrl("http://167772161")).toThrow(EmbedError);
    });

    it("rejects decimal IP for 192.168.1.1 (3232235777)", () => {
      expect(() => validateUrl("http://3232235777")).toThrow(EmbedError);
    });

    it("allows decimal IP for public address (134744072 = 8.8.8.8)", () => {
      expect(() => validateUrl("http://134744072")).not.toThrow();
    });
  });

  describe("URL length limit", () => {
    it("accepts URLs up to 2048 characters", () => {
      const url = `https://example.com/${"a".repeat(2048 - "https://example.com/".length)}`;
      expect(url.length).toBe(2048);
      expect(() => validateUrl(url)).not.toThrow();
    });

    it("rejects URLs longer than 2048 characters", () => {
      const url = `https://example.com/${"a".repeat(2049 - "https://example.com/".length)}`;
      expect(url.length).toBe(2049);
      expect(() => validateUrl(url)).toThrow(EmbedError);
      expect(() => validateUrl(url)).toThrow(/maximum length/);
    });
  });

  describe("error properties", () => {
    it("throws EmbedError with VALIDATION_ERROR code", () => {
      try {
        validateUrl("ftp://example.com");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(EmbedError);
        expect((err as EmbedError).code).toBe("VALIDATION_ERROR");
      }
    });

    it("truncates long URLs in error messages", () => {
      // A long invalid string (no protocol) that will fail URL parsing
      const longUrl = `${"x".repeat(300)}`;
      try {
        validateUrl(longUrl);
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as EmbedError).message.length).toBeLessThan(300);
        expect((err as EmbedError).message).toContain("…");
      }
    });
  });
});
