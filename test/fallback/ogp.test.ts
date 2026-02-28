import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveWithOgp } from '../../src/fallback/ogp.js';

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Example Article" />
  <meta property="og:description" content="This is a test article" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta property="og:site_name" content="Example Site" />
  <meta property="og:type" content="article" />
</head>
<body></body>
</html>
`;

const videoHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Video Title" />
  <meta property="og:video:url" content="https://example.com/embed/video" />
  <meta property="og:video:type" content="text/html" />
  <meta property="og:site_name" content="VideoSite" />
</head>
<body></body>
</html>
`;

describe('OGP Fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves OGP metadata into a link card', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleHtml),
      }),
    );

    const result = await resolveWithOgp('https://example.com/article');

    expect(result.type).toBe('link');
    expect(result.title).toBe('Example Article');
    expect(result.provider).toBe('Example Site');
    expect(result.thumbnail_url).toBe('https://example.com/image.jpg');
    expect(result.html).toContain('framer-framer-card');
    expect(result.html).toContain('Example Article');
    expect(result.html).toContain('This is a test article');
  });

  it('resolves video OGP into an iframe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(videoHtml),
      }),
    );

    const result = await resolveWithOgp('https://example.com/video');

    expect(result.type).toBe('video');
    expect(result.html).toContain('<iframe');
    expect(result.html).toContain('https://example.com/embed/video');
    expect(result.provider).toBe('VideoSite');
  });

  it('throws on failed fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    );

    await expect(resolveWithOgp('https://example.com/404')).rejects.toThrow(
      'OGP fallback: failed to fetch',
    );
  });

  it('uses hostname as provider when og:site_name is missing', async () => {
    const minimalHtml = `
      <html><head>
        <meta property="og:title" content="Test" />
      </head><body></body></html>
    `;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(minimalHtml),
      }),
    );

    const result = await resolveWithOgp('https://example.com/page');
    expect(result.provider).toBe('example.com');
  });
});
