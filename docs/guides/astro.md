# Astro Integration Guide

Integrate [framer-framer](https://github.com/piroz/framer-framer) into your Astro site.

## Requirements

| Dependency | Version |
|---|---|
| Astro | 4.0+ |
| Node.js | 22.0+ |
| `framer-framer` | 3.0.0+ |
| `@framer-framer/astro` | 3.2.0+ (optional) |

For interactive embeds with React or Vue components, also install the corresponding framework integration and Astro adapter.

## Installation

```bash
npm install framer-framer
```

For the dedicated Astro component and helpers, also install the Astro integration:

```bash
npm install @framer-framer/astro
```

## Using `@framer-framer/astro`

The `@framer-framer/astro` package provides `getEmbed()` and `getEmbedBatch()` helpers designed for Astro's frontmatter, with built-in error handling that returns `{ data, error }` instead of throwing:

```astro
---
import { getEmbed } from '@framer-framer/astro';

const { data, error } = await getEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
  maxWidth: 800,
});
---

{data && <div set:html={data.html} />}
{error && <p>Failed to load embed</p>}
```

### Batch resolution

```astro
---
import { getEmbedBatch } from '@framer-framer/astro';

const results = await getEmbedBatch([
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://vimeo.com/1084537',
], { concurrency: 3 });
---

{results.map((r) => r.data && <div set:html={r.data.html} />)}
```

## Static Embeds (Using Core Library Directly)

Alternatively, call core `embed()` directly in the component frontmatter:

```astro
---
// src/components/Embed.astro
import { embed } from 'framer-framer';

interface Props {
  url: string;
  maxWidth?: number;
}

const { url, maxWidth } = Astro.props;

let html = '';
let title = '';
try {
  const result = await embed(url, { maxWidth, timeout: 5000 });
  html = result.html;
  title = result.title ?? '';
} catch {
  // Fallback to a plain link on error
}
---

{html ? (
  <div class="embed-container" set:html={html} />
) : (
  <a href={url} target="_blank" rel="noopener noreferrer">{title || url}</a>
)}

<style>
  .embed-container {
    max-width: 100%;
    overflow: hidden;
  }
</style>
```

Usage in a page:

```astro
---
// src/pages/index.astro
import Embed from '../components/Embed.astro';
---

<html>
  <body>
    <h1>My Page</h1>
    <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" maxWidth={800} />
    <Embed url="https://x.com/jack/status/20" />
  </body>
</html>
```

This approach resolves embeds at build time — the resulting HTML is fully static with zero client-side JavaScript.

## Multiple Embeds (Batch Resolution)

For pages with multiple embeds, use `embedBatch()` to resolve them in parallel:

```astro
---
import { embedBatch, EmbedError } from 'framer-framer';

const urls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://x.com/jack/status/20',
  'https://vimeo.com/1084537',
];

const results = await embedBatch(urls, { concurrency: 3, timeout: 5000 });
---

{results.map((result, i) => (
  result instanceof EmbedError ? (
    <a href={urls[i]} target="_blank" rel="noopener noreferrer">{urls[i]}</a>
  ) : (
    <div class="embed-container" set:html={result.html} />
  )
))}
```

## Interactive Embeds (Client-Side with React)

For dynamic embeds that resolve client-side (e.g. user-supplied URLs), use `@framer-framer/react` with Astro's React integration:

```bash
npx astro add react
npm install @framer-framer/react
```

```tsx
// src/components/InteractiveEmbed.tsx
import { Embed } from '@framer-framer/react';

export function InteractiveEmbed({ url }: { url: string }) {
  return <Embed url={url} maxWidth={800} theme="auto" />;
}
```

```astro
---
// src/pages/dynamic.astro
import { InteractiveEmbed } from '../components/InteractiveEmbed';
---

<html>
  <body>
    <InteractiveEmbed client:load url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
  </body>
</html>
```

Use `client:load` for immediate hydration or `client:visible` to defer until the embed scrolls into view:

```astro
<!-- Hydrate only when visible — reduces initial JS -->
<InteractiveEmbed client:visible url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
```

## Interactive Embeds (Client-Side with Vue)

Similarly, use `@framer-framer/vue` with Astro's Vue integration:

```bash
npx astro add vue
npm install @framer-framer/vue
```

```vue
<!-- src/components/InteractiveEmbed.vue -->
<script setup>
import { Embed } from '@framer-framer/vue';

defineProps<{ url: string }>();
</script>

<template>
  <Embed :url="url" :max-width="800" />
</template>
```

```astro
---
import InteractiveEmbed from '../components/InteractiveEmbed.vue';
---

<InteractiveEmbed client:visible url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
```

## Server Endpoint (API Route)

Create a server endpoint for on-demand embed resolution:

```ts
// src/pages/api/embed.ts
import type { APIRoute } from 'astro';
import { embed } from 'framer-framer';

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await embed(targetUrl, { maxWidth: 800, timeout: 5000 });
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
```

> Requires `output: 'server'` or `output: 'hybrid'` in `astro.config.mjs`.

## Caching Strategies

### Build-Time (Static Sites)

For static sites (`output: 'static'`), embeds are resolved once at build time. No runtime caching needed — rebuild to refresh.

### In-Memory Cache (SSR)

For SSR mode, use the built-in LRU cache:

```ts
// src/lib/embed-cache.ts
import { MemoryCacheAdapter } from 'framer-framer';

export const embedCache = new MemoryCacheAdapter({ maxSize: 200, ttl: 300_000 });
```

```astro
---
import { embed } from 'framer-framer';
import { embedCache } from '../lib/embed-cache';

const result = await embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
  cache: embedCache,
});
---

<div set:html={result.html} />
```

## Content Collections

Use framer-framer with Astro content collections to embed URLs from Markdown/MDX frontmatter:

```astro
---
// src/pages/posts/[slug].astro
import { getEntry } from 'astro:content';
import { embed } from 'framer-framer';

const post = await getEntry('blog', Astro.params.slug!);
const { Content } = await post.render();

let embedHtml = '';
if (post.data.embedUrl) {
  try {
    const result = await embed(post.data.embedUrl, { maxWidth: 800 });
    embedHtml = result.html;
  } catch {
    // Fallback handled in template
  }
}
---

<article>
  <h1>{post.data.title}</h1>
  {embedHtml && <div class="embed-container" set:html={embedHtml} />}
  <Content />
</article>
```

## Error Handling

For build-time resolution, handle errors in the frontmatter with try/catch (as shown above). For client-side components, use the framework-specific error handling:

```tsx
// React
<Embed
  url={url}
  errorFallback={(err) => (
    <a href={url} target="_blank" rel="noopener noreferrer">
      Could not load embed — open link
    </a>
  )}
/>
```

## TypeScript

All types are exported from `framer-framer`:

```ts
import type { EmbedResult, EmbedOptions, EmbedError } from 'framer-framer';
```

For the Astro integration:

```ts
import type { EmbedProps, GetEmbedOptions, GetEmbedResult } from '@framer-framer/astro';
```

For React/Vue interactive components, types are also available from the respective packages:

```ts
import type { EmbedProps } from '@framer-framer/react';
import type { EmbedProps } from '@framer-framer/vue';
```
