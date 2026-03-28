# @framer-framer/vue

Vue 3 embed component for [framer-framer](https://github.com/piroz/framer-framer). Resolve any URL to embed HTML with a simple component or composable.

## Installation

```bash
npm install @framer-framer/vue framer-framer vue
```

## Usage

### `<Embed>` Component

```vue
<script setup>
import { Embed } from '@framer-framer/vue';
</script>

<template>
  <Embed
    url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    :max-width="640"
    @load="(result) => console.log('Loaded:', result.provider)"
    @error="(err) => console.error(err)"
  />
</template>
```

### Custom Slots

```vue
<template>
  <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
    <!-- Custom loading skeleton -->
    <template #loading>
      <div class="skeleton" />
    </template>

    <!-- Custom error display -->
    <template #error="{ error }">
      <div class="error">Failed: {{ error.message }}</div>
    </template>

    <!-- Custom embed rendering -->
    <template #default="{ result }">
      <div v-html="result.html" />
      <p>{{ result.title }} — {{ result.provider }}</p>
    </template>
  </Embed>
</template>
```

### `useEmbed()` Composable

```vue
<script setup>
import { useEmbed } from '@framer-framer/vue';

const { result, loading, error } = useEmbed(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  { maxWidth: 640 }
);
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="result" v-html="result.html" />
</template>
```

The composable also accepts a reactive ref or getter as the URL:

```vue
<script setup>
import { ref } from 'vue';
import { useEmbed } from '@framer-framer/vue';

const url = ref('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
const { result, loading, error } = useEmbed(url);
</script>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | Yes | URL to resolve |
| `maxWidth` | `number` | No | Max embed width |
| `maxHeight` | `number` | No | Max embed height |
| `options` | `EmbedOptions` | No | Options passed to framer-framer's `embed()` |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@load` | `EmbedResult` | Emitted when the embed is resolved |
| `@error` | `Error` | Emitted when resolution fails |

## Slots

| Slot | Props | Description |
|------|-------|-------------|
| `default` | `{ result: EmbedResult }` | Custom embed rendering |
| `loading` | — | Custom loading skeleton |
| `error` | `{ error: Error }` | Custom error display |

## Nuxt Integration

### SSR with `useNuxtEmbed()` (Recommended)

The `useNuxtEmbed()` composable resolves embeds on the server and hydrates the result on the client — no loading flash, instant rendering.

```vue
<script setup>
import { useNuxtEmbed } from '@framer-framer/vue/nuxt';

const { data, status, error, refresh } = useNuxtEmbed(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  { maxWidth: 640 }
);
</script>

<template>
  <div v-if="status === 'pending'">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="data" v-html="data.html" />
</template>
```

#### Reactive URL

```vue
<script setup>
import { ref } from 'vue';
import { useNuxtEmbed } from '@framer-framer/vue/nuxt';

const url = ref('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
const { data, status } = useNuxtEmbed(url);
</script>
```

#### Lazy Loading

Use `lazy: true` to skip server-side resolution and resolve client-side only:

```vue
<script setup>
import { useNuxtEmbed } from '@framer-framer/vue/nuxt';

const { data, status } = useNuxtEmbed(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  { lazy: true }
);
</script>
```

### Client-Only Mode

For the `<Embed>` component, use `<ClientOnly>` to avoid SSR issues:

```vue
<template>
  <ClientOnly>
    <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
    <template #fallback>
      <div>Loading embed...</div>
    </template>
  </ClientOnly>
</template>
```

## License

MIT
