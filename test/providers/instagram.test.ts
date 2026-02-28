import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstagramProvider } from '../../src/providers/instagram.js';

describe('InstagramProvider', () => {
  const provider = new InstagramProvider();

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'rich',
            html: '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/abc123/"><a href="https://www.instagram.com/p/abc123/">Post</a></blockquote><script async src="//www.instagram.com/embed.js"></script>',
            width: 658,
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws without access token', async () => {
    await expect(
      provider.resolve('https://www.instagram.com/p/abc123/'),
    ).rejects.toThrow('Instagram oEmbed requires a Meta access token');
  });

  it('resolves with access token', async () => {
    const result = await provider.resolve(
      'https://www.instagram.com/p/abc123/',
      { meta: { accessToken: 'APP_ID|CLIENT_TOKEN' } },
    );

    expect(result.provider).toBe('instagram');
    expect(result.type).toBe('rich');
    expect(result.html).toContain('instagram-media');

    const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain('access_token=APP_ID%7CCLIENT_TOKEN');
    expect(fetchCall).toContain('instagram_oembed');
  });
});
