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

This package uses the `"use client"` directive and is designed as a Client Component. During SSR, it renders the skeleton placeholder. The embed is resolved client-side after hydration via `useEffect`.

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

### Next.js Integration

```tsx
// app/page.tsx (Server Component)
import { EmbedSection } from './EmbedSection';

export default function Page() {
  return <EmbedSection url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />;
}
```

```tsx
// app/EmbedSection.tsx (Client Component)
'use client';
import { Embed } from '@framer-framer/react';

export function EmbedSection({ url }: { url: string }) {
  return <Embed url={url} maxWidth={800} />;
}
```

## License

MIT
