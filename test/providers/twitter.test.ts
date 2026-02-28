import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TwitterProvider } from '../../src/providers/twitter.js';

describe('TwitterProvider', () => {
  const provider = new TwitterProvider();

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'rich',
            html: '<blockquote class="twitter-tweet"><p>Hello world</p></blockquote>\n<script async src="https://platform.twitter.com/widgets.js"></script>',
            author_name: 'jack',
            author_url: 'https://twitter.com/jack',
            width: 550,
            cache_age: '3153600000',
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a twitter.com URL', async () => {
    const result = await provider.resolve(
      'https://twitter.com/jack/status/20',
    );

    expect(result.provider).toBe('twitter');
    expect(result.type).toBe('rich');
    expect(result.html).toContain('twitter-tweet');
    expect(result.author_name).toBe('jack');
  });

  it('resolves an x.com URL', async () => {
    const result = await provider.resolve(
      'https://x.com/elonmusk/status/123456789',
    );

    expect(result.provider).toBe('twitter');
    expect(result.html).toContain('twitter-tweet');
  });
});
