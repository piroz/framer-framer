# Next.js Integration Guide

Integrate [framer-framer](https://github.com/piroz/framer-framer) into your Next.js App Router application.

## Requirements

| Dependency | Version |
|---|---|
| Next.js | 14.0+ (App Router) |
| React | 18.0+ or 19.0+ |
| Node.js | 22.0+ |
| `@framer-framer/react` | 3.2.0+ |
| `framer-framer` | 3.2.0+ |

## Installation

```bash
npm install @framer-framer/react framer-framer
```

## Basic Usage

`@framer-framer/react` is a Client Component (ships with `"use client"`). Use it directly in Server Components — Next.js handles the client boundary automatically.

```tsx
// app/page.tsx (Server Component)
import { Embed } from '@framer-framer/react';

export default function Page() {
  return (
    <main>
      <h1>My Page</h1>
      <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
    </main>
  );
}
```

If you need to pass callbacks like `onLoad` or `onError`, wrap the component in a Client Component:

```tsx
// app/EmbedSection.tsx
'use client';
import { Embed } from '@framer-framer/react';

export function EmbedSection({ url }: { url: string }) {
  return (
    <Embed
      url={url}
      maxWidth={800}
      onLoad={(result) => console.log('Loaded:', result.title)}
      onError={(err) => console.error('Failed:', err)}
    />
  );
}
```

```tsx
// app/page.tsx
import { EmbedSection } from './EmbedSection';

export default function Page() {
  return <EmbedSection url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />;
}
```

## SSR Behavior

The `<Embed>` component renders a loading skeleton during SSR. After hydration, it resolves the embed client-side via `useEffect`. This means:

- **SSR output**: Skeleton placeholder (no layout shift when the embed loads)
- **Client hydration**: Fetches oEmbed data and renders the embed HTML
- **No server-side network calls**: The component is designed for client-side resolution only

## Using the `useEmbed` Hook

For custom embed rendering:

```tsx
'use client';
import { useEmbed } from '@framer-framer/react';

export function CustomEmbed({ url }: { url: string }) {
  const { status, data, error } = useEmbed(url, { maxWidth: 640 });

  if (status === 'loading') return <div className="animate-pulse h-64 bg-gray-200 rounded" />;
  if (status === 'error') return <p className="text-red-500">Failed to load embed</p>;

  return (
    <div>
      <h2>{data.title}</h2>
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
    </div>
  );
}
```

## Server-Side Resolution (API Route)

To resolve embeds on the server (e.g. for SEO or caching), use the core library in a Route Handler:

```ts
// app/api/embed/route.ts
import { embed } from 'framer-framer';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const result = await embed(url, { maxWidth: 800, timeout: 5000 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
```

Then fetch from your component:

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { EmbedResult } from 'framer-framer';

export function ServerEmbed({ url }: { url: string }) {
  const [result, setResult] = useState<EmbedResult | null>(null);

  useEffect(() => {
    fetch(`/api/embed?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then(setResult);
  }, [url]);

  if (!result) return <div>Loading...</div>;
  return <div dangerouslySetInnerHTML={{ __html: result.html }} />;
}
```

## Dark Mode

The `<Embed>` component supports `theme` prop with three modes:

```tsx
<Embed url="..." theme="light" />  {/* Always light */}
<Embed url="..." theme="dark" />   {/* Always dark */}
<Embed url="..." theme="auto" />   {/* Follows prefers-color-scheme (default) */}
```

## Caching Strategies

### In-Memory Cache (Single Instance)

Use the built-in LRU cache for applications running on a single server instance:

```tsx
// lib/embed-cache.ts
import { createCache } from 'framer-framer';

export const embedCache = createCache({ maxSize: 200, ttl: 300_000 }); // 5 min TTL
```

```ts
// app/api/embed/route.ts
import { embed } from 'framer-framer';
import { embedCache } from '@/lib/embed-cache';

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

  const result = await embed(url, { cache: embedCache });
  return Response.json(result);
}
```

### External Cache (Multi-Instance / Serverless)

For serverless deployments (Vercel, etc.), implement the `CacheAdapter` interface with an external store:

```ts
import type { CacheAdapter, EmbedResult } from 'framer-framer';
import { kv } from '@vercel/kv';

class KVCacheAdapter implements CacheAdapter {
  async get(key: string): Promise<EmbedResult | undefined> {
    return (await kv.get<EmbedResult>(`embed:${key}`)) ?? undefined;
  }

  async set(key: string, value: EmbedResult, ttl?: number): Promise<void> {
    await kv.set(`embed:${key}`, value, { ex: ttl ?? 300 });
  }

  async delete(key: string): Promise<boolean> {
    return (await kv.del(`embed:${key}`)) > 0;
  }

  async clear(): Promise<void> {
    // Implementation depends on your KV setup
  }
}
```

## Error Handling

Use React error boundaries alongside the component's built-in error handling:

```tsx
<Embed
  url={url}
  errorFallback={(err) => (
    <div className="p-4 border border-red-200 rounded bg-red-50">
      <p>Could not load embed: {err.message}</p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open link directly
      </a>
    </div>
  )}
/>
```

## Dynamic Imports (Optional)

To reduce the initial JavaScript bundle, dynamically import the component:

```tsx
import dynamic from 'next/dynamic';

const Embed = dynamic(
  () => import('@framer-framer/react').then((mod) => ({ default: mod.Embed })),
  {
    loading: () => <div className="animate-pulse h-64 bg-gray-200 rounded" />,
    ssr: false,
  },
);
```

## TypeScript

All types are exported from `@framer-framer/react` and `framer-framer`:

```tsx
import type { EmbedProps, UseEmbedReturn, EmbedStatus } from '@framer-framer/react';
import type { EmbedResult, EmbedOptions, EmbedError } from 'framer-framer';
```
