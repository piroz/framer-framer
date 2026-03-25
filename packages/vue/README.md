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

`@framer-framer/vue` works with Nuxt 3 out of the box. Since `embed()` calls fetch external oEmbed APIs, use the component in client-only mode to avoid SSR issues:

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

For server-side resolution, use the `useEmbed()` composable inside `onMounted`:

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { embed } from 'framer-framer';

const html = ref('');

onMounted(async () => {
  const result = await embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  html.value = result.html;
});
</script>
```

## License

MIT
