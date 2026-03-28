# Nuxt 3 Integration Guide

Integrate [framer-framer](https://github.com/piroz/framer-framer) into your Nuxt 3 application.

## Requirements

| Dependency | Version |
|---|---|
| Nuxt | 3.8+ |
| Vue | 3.3+ |
| Node.js | 22.0+ |
| `@framer-framer/vue` | 3.2.0+ |
| `framer-framer` | 3.0.0+ |

## Installation

```bash
npm install @framer-framer/vue framer-framer
```

## Basic Usage

Since `embed()` fetches from external oEmbed APIs, wrap the component in `<ClientOnly>` to avoid SSR hydration issues:

```vue
<script setup>
import { Embed } from '@framer-framer/vue';
</script>

<template>
  <ClientOnly>
    <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" :max-width="640" />
    <template #fallback>
      <div class="animate-pulse h-64 bg-gray-200 rounded" />
    </template>
  </ClientOnly>
</template>
```

## Using the `useEmbed` Composable

For custom rendering, use the `useEmbed` composable. It accepts a reactive ref or getter as the URL:

```vue
<script setup>
import { ref } from 'vue';
import { useEmbed } from '@framer-framer/vue';

const url = ref('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
const { result, loading, error } = useEmbed(url, { maxWidth: 640 });
</script>

<template>
  <ClientOnly>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else-if="result">
      <h2>{{ result.title }}</h2>
      <div v-html="result.html" />
    </div>
  </ClientOnly>
</template>
```

## Custom Slots

The `<Embed>` component provides slots for loading, error, and default states:

```vue
<script setup>
import { Embed } from '@framer-framer/vue';
</script>

<template>
  <ClientOnly>
    <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
      <template #loading>
        <div class="skeleton" />
      </template>

      <template #error="{ error }">
        <div class="text-red-500">Failed: {{ error.message }}</div>
      </template>

      <template #default="{ result }">
        <div v-html="result.html" />
        <p class="text-sm text-gray-500">{{ result.title }} — {{ result.provider }}</p>
      </template>
    </Embed>
  </ClientOnly>
</template>
```

## Server-Side Resolution (API Route)

Resolve embeds on the server using a Nitro API route:

```ts
// server/api/embed.get.ts
import { embed } from 'framer-framer';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const url = query.url as string;

  if (!url) {
    throw createError({ statusCode: 400, message: 'Missing url parameter' });
  }

  return await embed(url, { maxWidth: 800, timeout: 5000 });
});
```

Then fetch from a composable:

```vue
<script setup>
const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const { data: result } = await useFetch('/api/embed', {
  query: { url },
});
</script>

<template>
  <div v-if="result" v-html="result.html" />
</template>
```

This approach enables:
- Server-side caching via Nitro's built-in cache layer
- SEO-friendly rendering (embed HTML is in the initial response)
- No client-side oEmbed API calls

## Dark Mode

```vue
<Embed url="..." theme="light" />   <!-- Always light -->
<Embed url="..." theme="dark" />    <!-- Always dark -->
<Embed url="..." theme="auto" />    <!-- Follows prefers-color-scheme (default) -->
```

## Caching Strategies

### Server-Side Cache with Nitro

Use Nitro's `cachedFunction` for server-side caching:

```ts
// server/api/embed.get.ts
import { embed } from 'framer-framer';

const cachedEmbed = cachedFunction(
  async (url: string) => {
    return await embed(url, { maxWidth: 800, timeout: 5000 });
  },
  {
    maxAge: 300, // 5 minutes
    getKey: (url: string) => `embed:${url}`,
  },
);

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event);
  if (!url) {
    throw createError({ statusCode: 400, message: 'Missing url parameter' });
  }
  return await cachedEmbed(url as string);
});
```

### Client-Side Cache

Use the built-in LRU cache for client-side resolution:

```ts
// composables/useEmbedCache.ts
import { createCache } from 'framer-framer';

let cache: ReturnType<typeof createCache> | undefined;

export function useEmbedCache() {
  if (!cache) {
    cache = createCache({ maxSize: 100, ttl: 300_000 });
  }
  return cache;
}
```

```vue
<script setup>
import { useEmbed } from '@framer-framer/vue';
import { useEmbedCache } from '@/composables/useEmbedCache';

const cache = useEmbedCache();
const { result, loading, error } = useEmbed(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  { embedOptions: { cache } },
);
</script>
```

## Error Handling

Handle errors gracefully with the error slot or the composable:

```vue
<template>
  <ClientOnly>
    <Embed url="https://example.com/unknown">
      <template #error="{ error }">
        <div class="p-4 border border-red-200 rounded bg-red-50">
          <p>Could not load embed: {{ error.message }}</p>
          <a href="https://example.com/unknown" target="_blank" rel="noopener noreferrer">
            Open link directly
          </a>
        </div>
      </template>
    </Embed>
  </ClientOnly>
</template>
```

## Auto-Import (Optional)

Register the component globally via a Nuxt plugin:

```ts
// plugins/framer-framer.client.ts
import { Embed } from '@framer-framer/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('Embed', Embed);
});
```

Then use `<Embed>` anywhere without imports. The `.client.ts` suffix ensures the plugin only runs on the client.

## TypeScript

All types are exported from `@framer-framer/vue` and `framer-framer`:

```ts
import type { EmbedProps, UseEmbedOptions, UseEmbedReturn } from '@framer-framer/vue';
import type { EmbedResult, EmbedOptions, EmbedError } from 'framer-framer';
```
