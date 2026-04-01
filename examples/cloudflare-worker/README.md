# Cloudflare Workers Example

Deploy framer-framer as a Cloudflare Worker.

## Setup

```bash
npm install framer-framer
npm install -D wrangler
```

## Development

```bash
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Constraints

- **CPU time**: 10ms (free) / 50ms (paid) per invocation — subrequest wait time (e.g. oEmbed API calls) does not count toward this limit
- **Memory**: 128MB per isolate
- **Subrequests**: 50 per invocation — relevant when using `embedBatch()` with many URLs
- **Rate limiter**: `setInterval`-based cleanup runs within the isolate lifecycle; state is not shared across isolates
