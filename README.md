# framer-framer

Universal embed resolver for Node.js — extract embed HTML from any URL using oEmbed APIs.

Supports YouTube, X/Twitter, TikTok, Facebook, Instagram, Vimeo, Spotify, SoundCloud out of the box, with OGP metadata fallback for any other URL. Zero runtime dependencies.

## Install

```bash
npm install framer-framer
```

Requires Node.js 18+.

## Usage

```ts
import { embed } from "framer-framer";

const result = await embed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
console.log(result.html);     // <iframe width="200" height="113" src="..." ...>
console.log(result.type);     // "video"
console.log(result.title);    // "Rick Astley - Never Gonna Give You Up ..."
console.log(result.provider); // "youtube"
```

### Platform-specific functions

```ts
import {
  youtube, twitter, tiktok, facebook, instagram,
  vimeo, spotify, soundcloud,
} from "framer-framer";

await youtube("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
await twitter("https://x.com/user/status/123456789");
await tiktok("https://www.tiktok.com/@user/video/123456789");
await vimeo("https://vimeo.com/76979871");
await spotify("https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8");
await soundcloud("https://soundcloud.com/artist/track");

// Facebook / Instagram require a Meta access token
await facebook("https://www.facebook.com/video/123", {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
await instagram("https://www.instagram.com/p/ABC123/", {
  meta: { accessToken: "APP_ID|CLIENT_TOKEN" },
});
```

### Options

```ts
await embed(url, {
  maxWidth: 640,              // Max embed width
  maxHeight: 480,             // Max embed height
  fallback: true,             // OGP fallback for unknown URLs (default: true)
  meta: {                     // Required for Facebook/Instagram
    accessToken: "APP_ID|CLIENT_TOKEN",
  },
});
```

### OGP fallback

URLs that don't match any built-in provider are resolved via OGP meta tags automatically. Disable with `fallback: false`.

```ts
const result = await embed("https://example.com/article", { fallback: true });
// Returns link card HTML built from og:title, og:description, og:image
```

### Custom providers

```ts
import { registerProvider, OEmbedProvider } from "framer-framer";

class DailymotionProvider extends OEmbedProvider {
  name = "dailymotion";
  protected patterns = [/dailymotion\.com\/video\//];
  protected endpoint = "https://www.dailymotion.com/services/oembed";
}

registerProvider(new DailymotionProvider());
```

## EmbedResult

| Field             | Type     | Description                       |
| ----------------- | -------- | --------------------------------- |
| `type`            | `string` | `"rich"` `"video"` `"photo"` `"link"` |
| `html`            | `string` | Embed HTML                        |
| `provider`        | `string` | Provider name                     |
| `url`             | `string` | Original URL                      |
| `title`           | `string?` | Content title                    |
| `author_name`     | `string?` | Author name                      |
| `author_url`      | `string?` | Author URL                       |
| `thumbnail_url`   | `string?` | Thumbnail image URL              |
| `thumbnail_width` | `number?` | Thumbnail width                  |
| `thumbnail_height`| `number?` | Thumbnail height                 |
| `width`           | `number?` | Embed width                      |
| `height`          | `number?` | Embed height                     |
| `raw`             | `object?` | Raw oEmbed response              |

## License

MIT
