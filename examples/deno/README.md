# Deno Example

Run framer-framer on Deno.

## Run locally

```bash
deno run --allow-net main.ts
```

## Deploy to Deno Deploy

```bash
deployctl deploy --project=your-project main.ts
```

## Notes

- Deno supports npm packages via `npm:` specifiers — no `node_modules` required
- All Web standard APIs used by framer-framer are natively available in Deno
- For Deno Deploy, ensure `--allow-net` permissions are configured
