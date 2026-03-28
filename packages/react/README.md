# @framer-framer/react

React component for [framer-framer](https://github.com/piroz/framer-framer) — embed any URL with `<Embed url="..." />`.

## Installation

```bash
npm install @framer-framer/react framer-framer react react-dom
```

## Quick Start

```tsx
import { Embed } from '@framer-framer/react';

function App() {
  return <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />;
}
```

## API

### `<Embed />` Component

| Prop | Type | Description |
|---|---|---|
| `url` | `string` | **(required)** URL to embed |
| `maxWidth` | `number` | Max embed width in pixels |
| `maxHeight` | `number` | Max embed height in pixels |
| `embedOptions` | `EmbedOptions` | Options passed to `embed()` |
| `initialData` | `EmbedResult` | Pre-fetched embed data (skips client-side fetch) |
| `onLoad` | `(result: EmbedResult) => void` | Called on successful resolution |
| `onError` | `(error: Error) => void` | Called on resolution failure |
| `loadingFallback` | `ReactNode` | Custom loading component |
| `errorFallback` | `ReactNode \| (error: Error) => ReactNode` | Custom error component |
| `className` | `string` | CSS class for the container |
| `style` | `CSSProperties` | Inline styles for the container |
| `ref` | `Ref<HTMLDivElement>` | Forwarded ref to container div |

### `useEmbed()` Hook

```tsx
import { useEmbed } from '@framer-framer/react';

function MyEmbed({ url }: { url: string }) {
  const { status, data, error } = useEmbed(url, { maxWidth: 600 });

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'error') return <p>Error: {error.message}</p>;
  return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
}
```

### `<Skeleton />` and `<ErrorState />`

Built-in UI components used by `<Embed />` internally. You can import them for custom compositions:

```tsx
import { Skeleton, ErrorState } from '@framer-framer/react';
```

## SSR / React Server Components

### Server Component (`EmbedServer`)

Use `EmbedServer` from the `/server` export to fetch embed data entirely on the server — no client-side JavaScript required:

```tsx
// app/page.tsx (Next.js App Router - Server Component)
import { EmbedServer } from '@framer-framer/react/server';

export default async function Page() {
  return <EmbedServer url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />;
}
```

`EmbedServer` is an async component that calls `embed()` on the server and renders the resulting HTML directly. It does not include `"use client"` and ships zero client-side JavaScript.

| Prop | Type | Description |
|---|---|---|
| `url` | `string` | **(required)** URL to embed |
| `maxWidth` | `number` | Max embed width in pixels |
| `maxHeight` | `number` | Max embed height in pixels |
| `embedOptions` | `EmbedOptions` | Options passed to `embed()` |
| `errorFallback` | `ReactNode \| (error: Error) => ReactNode` | Custom error component |
| `className` | `string` | CSS class for the container |
| `style` | `CSSProperties` | Inline styles for the container |
| `theme` | `'light' \| 'dark' \| 'auto'` | Theme mode (default: `'auto'`) |

### Server-fetched data with Client Component (`initialData`)

Fetch data on the server and pass it to the client `<Embed />` via `initialData` to avoid a loading flash while retaining client-side interactivity (callbacks, ref, etc.):

```tsx
// app/page.tsx (Server Component)
import { embed } from 'framer-framer';
import { EmbedSection } from './EmbedSection';

export default async function Page() {
  const data = await embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  return <EmbedSection url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" initialData={data} />;
}
```

```tsx
// app/EmbedSection.tsx (Client Component)
'use client';
import { Embed } from '@framer-framer/react';
import type { EmbedResult } from 'framer-framer';

export function EmbedSection({ url, initialData }: { url: string; initialData: EmbedResult }) {
  return <Embed url={url} initialData={initialData} onLoad={(r) => console.log(r.title)} />;
}
```

### Client-only (default)

The main export uses the `"use client"` directive. During SSR it renders the skeleton placeholder; the embed resolves client-side after hydration via `useEffect`.

## Examples

### Custom Loading & Error

```tsx
<Embed
  url="https://x.com/jack/status/20"
  loadingFallback={<MySpinner />}
  errorFallback={(err) => <p>Could not load: {err.message}</p>}
/>
```

### With Callbacks

```tsx
<Embed
  url="https://vimeo.com/1084537"
  onLoad={(result) => console.log('Loaded:', result.title)}
  onError={(err) => console.error('Failed:', err)}
/>
```

### Next.js App Router

```tsx
// app/page.tsx — fully server-rendered, zero client JS
import { EmbedServer } from '@framer-framer/react/server';

export default async function Page() {
  return <EmbedServer url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" maxWidth={800} />;
}
```

## License

MIT
