import { describe, expect, it } from 'vitest';
import { findProvider } from '../src/resolver.js';

describe('findProvider - URL auto-detection', () => {
  // YouTube
  const youtubeUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/abc123',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/live/abc123',
  ];

  for (const url of youtubeUrls) {
    it(`detects YouTube: ${url}`, () => {
      expect(findProvider(url)?.name).toBe('youtube');
    });
  }

  // X/Twitter
  const twitterUrls = [
    'https://twitter.com/jack/status/20',
    'https://www.twitter.com/user/status/123456',
    'https://x.com/elonmusk/status/123456789',
    'https://www.x.com/user/status/999',
  ];

  for (const url of twitterUrls) {
    it(`detects Twitter: ${url}`, () => {
      expect(findProvider(url)?.name).toBe('twitter');
    });
  }

  // TikTok
  const tiktokUrls = [
    'https://www.tiktok.com/@user/video/1234567890',
    'https://tiktok.com/@user.name/video/1234567890',
    'https://www.tiktok.com/t/ZTRabcdef/',
    'https://vm.tiktok.com/ZTRabcdef/',
  ];

  for (const url of tiktokUrls) {
    it(`detects TikTok: ${url}`, () => {
      expect(findProvider(url)?.name).toBe('tiktok');
    });
  }

  // Facebook
  const facebookUrls = [
    'https://www.facebook.com/user/posts/123456',
    'https://facebook.com/user/posts/123456',
    'https://www.facebook.com/watch/123456',
    'https://fb.watch/abc123/',
    'https://www.facebook.com/user/videos/123456',
    'https://www.facebook.com/share/abc123/',
  ];

  for (const url of facebookUrls) {
    it(`detects Facebook: ${url}`, () => {
      expect(findProvider(url)?.name).toBe('facebook');
    });
  }

  // Instagram
  const instagramUrls = [
    'https://www.instagram.com/p/abc123/',
    'https://instagram.com/p/abc123/',
    'https://www.instagram.com/reel/abc123/',
    'https://www.instagram.com/tv/abc123/',
  ];

  for (const url of instagramUrls) {
    it(`detects Instagram: ${url}`, () => {
      expect(findProvider(url)?.name).toBe('instagram');
    });
  }

  // Unknown URLs
  it('returns undefined for unknown URLs', () => {
    expect(findProvider('https://example.com')).toBeUndefined();
    expect(findProvider('https://github.com/piroz/repo')).toBeUndefined();
  });
});
