#!/usr/bin/env node
/**
 * Provider render check — generates an HTML page that embeds all providers
 * and serves it locally for visual verification in Chrome.
 *
 * Usage:
 *   node tools/render-check.mjs          # build + generate + serve on :8765
 *   node tools/render-check.mjs --port 3333
 *   node tools/render-check.mjs --no-serve  # generate only (writes tools/.render-check.html)
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathResolve(__dirname, "..");
const outPath = pathResolve(__dirname, ".render-check.html");

// ---------------------------------------------------------------------------
// Test URLs — one per provider, chosen for stability
// ---------------------------------------------------------------------------
const testCases = [
  {
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    note: "oEmbed",
  },
  {
    provider: "twitter",
    url: "https://twitter.com/jack/status/20",
    note: "oEmbed (requires JS for full render)",
  },
  {
    provider: "vimeo",
    url: "https://vimeo.com/76979871",
    note: "oEmbed",
  },
  {
    provider: "spotify",
    url: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
    note: "oEmbed",
  },
  {
    provider: "soundcloud",
    url: "https://soundcloud.com/rick-astley-official/never-gonna-give-you-up-4",
    note: "oEmbed",
  },
  {
    provider: "tiktok",
    url: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    note: "oEmbed (requires JS for full render)",
  },
  {
    provider: "huggingface",
    url: "https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell",
    note: "iframe (Gradio app)",
  },
  {
    provider: "gradio",
    url: "https://black-forest-labs-flux-1-schnell.hf.space",
    note: "iframe (direct hf.space)",
  },
  {
    provider: "flickr",
    url: "https://www.flickr.com/photos/beautyofnz/52748122015",
    note: "oEmbed",
  },
  {
    provider: "slideshare",
    url: "https://www.slideshare.net/slideshow/introduction-to-artificial-intelligence-ai/265837368",
    note: "oEmbed",
  },
  {
    provider: "speakerdeck",
    url: "https://speakerdeck.com/rstudio/building-effective-data-science-teams",
    note: "oEmbed",
  },
  {
    provider: "pinterest",
    url: "https://www.pinterest.com/pin/786159678709919863/",
    note: "oEmbed",
  },
  {
    provider: "reddit",
    url: "https://www.reddit.com/r/programming/comments/1a2b3c/hello_world/",
    note: "oEmbed",
  },
  {
    provider: "niconico",
    url: "https://www.nicovideo.jp/watch/sm9",
    note: "oEmbed",
  },
  {
    provider: "note",
    url: "https://note.com/because_and/n/nc0b6348a16f5",
    note: "oEmbed",
  },
  // Facebook / Instagram are skipped — they require a Meta access token.
  // Uncomment and set META_ACCESS_TOKEN env var to test:
  // {
  //   provider: "facebook",
  //   url: "https://www.facebook.com/facebook/videos/10153231379946729/",
  //   note: "oEmbed (requires Meta token)",
  // },
  // {
  //   provider: "instagram",
  //   url: "https://www.instagram.com/p/CsJO_OrMGGJ/",
  //   note: "oEmbed (requires Meta token)",
  // },
];

// ---------------------------------------------------------------------------
// Build if needed
// ---------------------------------------------------------------------------
console.log("Building…");
execSync("npm run build", { cwd: root, stdio: "inherit" });

// ---------------------------------------------------------------------------
// Resolve all test URLs
// ---------------------------------------------------------------------------
const { embed } = await import(pathResolve(root, "dist/index.mjs"));

console.log(`\nResolving ${testCases.length} providers…\n`);

const results = [];
const metaToken = process.env.META_ACCESS_TOKEN;

for (const tc of testCases) {
  const start = performance.now();
  try {
    const opts = {};
    if ((tc.provider === "facebook" || tc.provider === "instagram") && metaToken) {
      opts.meta = { accessToken: metaToken };
    }
    const result = await embed(tc.url, opts);
    const ms = (performance.now() - start).toFixed(0);
    console.log(`  ✓ ${tc.provider} (${ms}ms)`);
    results.push({ ...tc, html: result.html, error: null });
  } catch (e) {
    const ms = (performance.now() - start).toFixed(0);
    console.log(`  ✗ ${tc.provider} (${ms}ms) — ${e.message}`);
    results.push({ ...tc, html: null, error: e.message });
  }
}

// ---------------------------------------------------------------------------
// Generate HTML
// ---------------------------------------------------------------------------
const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

const sections = results
  .map((r) => {
    const escaped = (r.html || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const statusClass = r.error ? "error" : "ok";
    const statusText = r.error ? `ERROR: ${r.error}` : "OK";
    const sandbox = (r.html || "").match(/sandbox="([^"]*)"/)?.[1];
    const referrer = (r.html || "").match(/referrerpolicy="([^"]*)"/)?.[1];

    return `
<section>
  <h2>
    <span class="provider-name">${r.provider}</span>
    <span class="badge ${statusClass}">${statusText}</span>
    <span class="note">${r.note}</span>
  </h2>
  ${sandbox ? `<div class="attrs"><b>sandbox:</b> ${sandbox} ${referrer ? `| <b>referrerpolicy:</b> ${referrer}` : ""}</div>` : ""}
  <div class="embed-container">
    ${r.html || `<p class="error-msg">${r.error}</p>`}
  </div>
  <details><summary>HTML source</summary><pre>${escaped || "N/A"}</pre></details>
</section>`;
  })
  .join("\n");

const page = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>framer-framer render check</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 1000px; margin: 0 auto; padding: 2em 1em;
    background: #0d1117; color: #c9d1d9;
  }
  h1 { color: #58a6ff; margin-bottom: .2em; }
  .meta { color: #8b949e; font-size: 13px; margin-bottom: 2em; }
  h2 { display: flex; align-items: center; gap: .6em; font-size: 1.1em; margin-top: 2.5em; }
  .provider-name { color: #79c0ff; }
  .badge {
    font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;
  }
  .badge.ok { background: #1b4332; color: #69f0ae; }
  .badge.error { background: #4a1919; color: #ff5252; }
  .note { color: #8b949e; font-size: 12px; font-weight: normal; }
  .attrs { font-size: 12px; color: #8b949e; margin: .3em 0 .8em; }
  .attrs b { color: #c9d1d9; }
  .embed-container {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 12px; overflow: hidden;
  }
  .embed-container iframe { display: block; border-radius: 4px; }
  .error-msg { color: #ff5252; margin: 1em 0; }
  details { margin-top: .4em; }
  summary { cursor: pointer; color: #8b949e; font-size: 12px; }
  pre {
    background: #0d1117; border: 1px solid #21262d; border-radius: 4px;
    padding: 1em; font-size: 11px; overflow-x: auto;
    white-space: pre-wrap; word-break: break-all; color: #8b949e;
  }
  .legend {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 1em 1.5em; margin-bottom: 2em; font-size: 13px;
  }
  .legend dt { color: #79c0ff; font-weight: 600; float: left; width: 120px; }
  .legend dd { margin-left: 130px; margin-bottom: .3em; color: #8b949e; }
</style>
</head>
<body>

<h1>framer-framer render check</h1>
<p class="meta">Generated: ${now} | Providers: ${results.length} | Errors: ${results.filter((r) => r.error).length}</p>

<div class="legend">
  <dl>
    <dt>oEmbed</dt><dd>HTML fetched from provider API — YouTube, Vimeo, Spotify, Flickr, SlideShare, SpeakerDeck, Pinterest, Reddit, Niconico, Note etc.</dd>
    <dt>iframe</dt><dd>HTML generated locally — HuggingFace, Gradio (check sandbox attrs)</dd>
    <dt>Facebook/IG</dt><dd>Skipped unless META_ACCESS_TOKEN is set</dd>
  </dl>
</div>

${sections}

</body>
</html>`;

writeFileSync(outPath, page);
console.log(`\nWrote ${outPath}`);

// ---------------------------------------------------------------------------
// Serve
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--no-serve")) {
  process.exit(0);
}

const portIdx = args.indexOf("--port");
const port = portIdx !== -1 ? Number(args[portIdx + 1]) : 8765;

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const html = readFileSync(outPath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`\n🔍 Render check: http://localhost:${port}/\n   Press Ctrl+C to stop.\n`);
});
