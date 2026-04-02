/**
 * Meta oEmbed API 検証スクリプト
 *
 * 使い方:
 *   export META_ACCESS_TOKEN="APP_ID|CLIENT_TOKEN"
 *   npx tsx tools/verify-meta-api.ts
 */
import { embed } from "../packages/core/src/index.js";

const token = process.env.META_ACCESS_TOKEN;
if (!token) {
  console.error("❌ META_ACCESS_TOKEN 環境変数を設定してください");
  console.error('   export META_ACCESS_TOKEN="YOUR_APP_ID|YOUR_CLIENT_TOKEN"');
  process.exit(1);
}

const testUrls = [
  { label: "Facebook (post)", url: "https://www.facebook.com/facebook/posts/10153231379946729/" },
  { label: "Facebook (video)", url: "https://www.facebook.com/facebook/videos/10153231379946729/" },
  { label: "Instagram", url: "https://www.instagram.com/p/BsOGulcndj-/" },
  { label: "Threads", url: "https://www.threads.net/@zuck/post/C1D2E3F4G5H" },
];

// fetch をラップしてリクエストURLをログに出す
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  // トークンをマスクして表示
  const masked = url.replace(/access_token=[^&]+/, "access_token=***");
  console.log(`   >> ${masked}`);
  return originalFetch(input, init);
};

async function main() {
  console.log("=== Meta oEmbed API Test ===\n");

  for (const { label, url } of testUrls) {
    console.log(`--- ${label} ---`);
    console.log(`URL: ${url}`);
    try {
      const result = await embed(url, { auth: { meta: { accessToken: token } } });
      console.log(`✅ provider: ${result.provider}`);
      console.log(`   type:     ${result.type}`);
      console.log(`   title:    ${result.title ?? "(none)"}`);
      console.log(`   html:     ${result.html?.substring(0, 120)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`❌ Error: ${msg}`);
    }
    console.log();
  }
}

main();
