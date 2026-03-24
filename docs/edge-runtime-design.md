# Edge ランタイム & プラガブルアダプター アーキテクチャ設計

本ドキュメントは、framer-framer を Edge ランタイム (Cloudflare Workers / Deno / Bun) に対応させるためのアーキテクチャ設計を記録する。設計フェーズのみを対象とし、実装は後続バージョンで行う。

## 1. EmbedCache のインターフェース抽出設計

### 現状分析

現在の `EmbedCache` (`src/cache.ts`) は `Map` ベースの LRU 実装にハードコードされている:

- 同期 API (`get()` → `EmbedResult | undefined`, `set()` → `void`)
- インメモリのみ（`Map<string, CacheEntry>` に保持）
- TTL ベースの lazy eviction
- LRU 方式の容量制御 (`maxSize`)

### CacheAdapter インターフェース

Redis 等の外部キャッシュは I/O を伴うため、**非同期 API** を基本とする。

```typescript
/**
 * Cache adapter interface.
 *
 * All methods return Promise to support external cache backends (Redis, KV, etc.).
 * In-memory adapters may resolve synchronously; the Promise wrapper adds
 * negligible overhead compared to the embed resolution itself.
 */
export interface CacheAdapter {
  /**
   * Look up a cached result.
   * Returns `undefined` on miss or expiry.
   */
  get(key: string): Promise<EmbedResult | undefined>;

  /**
   * Store a result in the cache.
   * The adapter is responsible for its own eviction policy.
   */
  set(key: string, value: EmbedResult, ttl?: number): Promise<void>;

  /**
   * Remove a specific entry from the cache.
   * Returns `true` if the entry existed.
   */
  delete(key: string): Promise<boolean>;

  /** Remove all entries from the cache. */
  clear(): Promise<void>;
}
```

**設計判断: 非同期 API を選択した理由**

| 観点 | 同期 API | 非同期 API |
|------|---------|-----------|
| インメモリキャッシュ | 自然にフィット | Promise wrap のオーバーヘッド（微小） |
| Redis / Memcached | 対応不可 | 自然にフィット |
| Cloudflare KV / R2 | 対応不可 | 自然にフィット |
| Deno KV | 対応不可 | 自然にフィット |
| API の一貫性 | 外部キャッシュで別 API が必要 | 全アダプターが同一 API |

embed 解決自体がネットワーク I/O を伴うため、キャッシュの `get/set` が `Promise` を返すことによるパフォーマンス影響は無視できる。

### キャッシュキーの設計

キャッシュキーの生成ロジックは `CacheAdapter` の外側（resolver レイヤー）に置く。現在の `buildKey()` 関数をそのまま流用し、アダプターはキー文字列のみを受け取る:

```typescript
// resolver.ts (現行 buildKey を維持)
function buildKey(url: string, options?: EmbedOptions): string {
  if (!options) return url;
  const parts: string[] = [url];
  if (options.maxWidth != null) parts.push(`w=${options.maxWidth}`);
  if (options.maxHeight != null) parts.push(`h=${options.maxHeight}`);
  if (options.sanitize === false) parts.push("s=0");
  return parts.join("|");
}
```

### 組み込みアダプター

#### MemoryCacheAdapter（現行 LRU の移行先）

```typescript
export class MemoryCacheAdapter implements CacheAdapter {
  private readonly map = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(options?: { maxSize?: number; ttl?: number });

  async get(key: string): Promise<EmbedResult | undefined>;
  async set(key: string, value: EmbedResult, ttl?: number): Promise<void>;
  async delete(key: string): Promise<boolean>;
  async clear(): Promise<void>;
}
```

#### Redis アダプター設計（将来実装）

```typescript
export class RedisCacheAdapter implements CacheAdapter {
  constructor(options: {
    client: RedisClient;       // ioredis or redis compatible
    keyPrefix?: string;        // default: "framer:"
    defaultTtl?: number;       // default: 300 (seconds)
    serializer?: {
      serialize(value: EmbedResult): string;
      deserialize(raw: string): EmbedResult;
    };
  });

  async get(key: string): Promise<EmbedResult | undefined>;
  async set(key: string, value: EmbedResult, ttl?: number): Promise<void>;
  async delete(key: string): Promise<boolean>;
  async clear(): Promise<void>;
}
```

Redis アダプターは `ioredis` / `redis` パッケージを peerDependency とし、ユーザーが直接インスタンスを渡す。シリアライゼーションはデフォルトで `JSON.stringify/parse` を使用し、カスタムシリアライザーを注入可能とする。

#### Cloudflare KV アダプター設計（将来実装）

```typescript
export class CloudflareKVCacheAdapter implements CacheAdapter {
  constructor(options: {
    namespace: KVNamespace;      // Cloudflare Workers KV binding
    keyPrefix?: string;          // default: "framer:"
    defaultTtl?: number;         // default: 300 (seconds)
  });
}
```

### 移行パス

1. **v3.2.0**: `CacheAdapter` インターフェースを追加。`EmbedOptions.cache` の型を `EmbedCache | CacheAdapter | false` に拡張。`EmbedCache` は deprecated とする
2. **v4.0.0**: `EmbedCache` クラスを削除。`cache` オプションの型を `CacheAdapter | false` に変更

## 2. Node.js 依存 API の抽象化レイヤー設計

### 現状分析

コードベースを調査した結果、**`node:net` を含む Node.js 固有 API は使用されていない**。

| 機能 | 現在の実装 | Node.js 依存 |
|------|-----------|-------------|
| SSRF チェック | URL 文字列ベースのパターンマッチ (`src/utils/url.ts`) | なし |
| HTTP リクエスト | `fetch` API | なし (Web 標準) |
| URL パース | `URL` コンストラクタ | なし (Web 標準) |
| タイマー | `setTimeout` / `setInterval` | なし (Web 標準) |
| 正規表現 | `RegExp` | なし (Web 標準) |
| HTML パース | 文字列操作 + 正規表現 | なし |
| ロギング | `console.error` | なし (Web 標準) |

**結論**: 現時点で Node.js 固有 API への依存はなく、コアライブラリ (`src/index.ts` のエクスポート) は既に Edge ランタイム互換である。

### SSRF チェックの Edge 互換性

現在の `validateUrl()` は文字列ベースの検証のみで、DNS 解決は行わない。これは Edge ランタイムでの制約ではなく、意図的な設計判断である:

**現行の保護レベル:**
- IP リテラル（`127.0.0.1`, `10.x.x.x`, `192.168.x.x` 等）のブロック
- 数値 IP（10進、16進、8進）の正規化とブロック
- IPv4-mapped IPv6 のブロック
- `localhost` ホスト名のブロック

**既知の制約:**
- DNS rebinding 攻撃は検出不可（ホスト名 → プライベート IP の解決）
- 設計ドキュメントでネットワークレベルの制御を推奨済み

**Edge ランタイム別の DNS 解決 API 調査:**

| ランタイム | DNS API | 利用可能性 |
|-----------|---------|-----------|
| Cloudflare Workers | なし (DNS over HTTPS は可能) | 制限あり |
| Deno | `Deno.resolveDns()` | 利用可能 |
| Bun | `bun:dns` / Node.js 互換 `dns.resolve()` | 利用可能 |
| Node.js | `dns.resolve()` / `dns.promises.resolve()` | 利用可能 |

**推奨設計**: オプショナルな DNS 解決ベースの SSRF チェックを、プラガブルな `UrlValidator` として設計する:

```typescript
/**
 * URL validator interface.
 * Allows runtime-specific SSRF protection strategies.
 */
export interface UrlValidator {
  /**
   * Validate a URL before fetching.
   * Throw EmbedError with code VALIDATION_ERROR to reject.
   */
  validate(url: string): Promise<void>;
}

/** Built-in string-based validator (current implementation, Edge-compatible) */
export class StringUrlValidator implements UrlValidator {
  async validate(url: string): Promise<void> {
    validateUrl(url); // existing synchronous validation
  }
}

/** DNS-resolving validator for Node.js environments */
export class DnsUrlValidator implements UrlValidator {
  private readonly base = new StringUrlValidator();
  private readonly resolve: (hostname: string) => Promise<string[]>;

  constructor(options?: {
    resolve?: (hostname: string) => Promise<string[]>;
  });

  async validate(url: string): Promise<void> {
    await this.base.validate(url);
    // Additionally resolve hostname and check resolved IPs
    const { hostname } = new URL(url);
    const addresses = await this.resolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIPv4(addr)) {
        throw new EmbedError("VALIDATION_ERROR", "...");
      }
    }
  }
}
```

## 3. Edge ランタイム対応の技術調査

### ランタイム別の制約と互換性

#### Cloudflare Workers

| 項目 | 状況 |
|------|------|
| `fetch` API | ✅ 利用可能（Cloudflare 独自の拡張あり） |
| `URL` / `URLSearchParams` | ✅ 利用可能 |
| `AbortController` / `AbortSignal` | ✅ 利用可能 |
| `setTimeout` / `setInterval` | ⚠️ `setInterval` は制限あり（Worker の実行時間制限） |
| `Map` / `Set` | ✅ 利用可能 |
| `console.error` | ✅ 利用可能 |
| ファイルシステム | ❌ 利用不可 |
| `node:net` / `node:dns` | ❌ 利用不可 |
| 実行時間 | ⚠️ CPU 時間 50ms（Paid プラン）/ 10ms（Free プラン） |
| メモリ | ⚠️ 128MB |
| サブリクエスト | ⚠️ 50 リクエスト/呼び出し（Paid: 1000） |
| KV ストレージ | ✅ `KVNamespace` API で利用可能 |

**framer-framer との互換性**: コアライブラリは互換。サーバー (`Hono`) も Cloudflare Workers 上で動作可能。`setInterval` を使用するレートリミッターの cleanup は Worker 環境では不要（各リクエストが独立した実行コンテキスト）。

#### Deno

| 項目 | 状況 |
|------|------|
| `fetch` API | ✅ 利用可能 |
| `URL` / `URLSearchParams` | ✅ 利用可能 |
| `AbortController` / `AbortSignal` | ✅ 利用可能 |
| `setTimeout` / `setInterval` | ✅ 利用可能 |
| `Map` / `Set` | ✅ 利用可能 |
| `console.error` | ✅ 利用可能 |
| Node.js 互換レイヤー | ✅ `node:` prefix で多くのモジュールが利用可能 |
| DNS 解決 | ✅ `Deno.resolveDns()` |
| KV ストレージ | ✅ `Deno.openKv()` |

**framer-framer との互換性**: 完全互換。npm パッケージとしてそのまま利用可能。

#### Bun

| 項目 | 状況 |
|------|------|
| `fetch` API | ✅ 利用可能 |
| `URL` / `URLSearchParams` | ✅ 利用可能 |
| `AbortController` / `AbortSignal` | ✅ 利用可能 |
| `setTimeout` / `setInterval` | ✅ 利用可能 |
| `Map` / `Set` | ✅ 利用可能 |
| `console.error` | ✅ 利用可能 |
| Node.js 互換レイヤー | ✅ ほぼ完全な Node.js API 互換 |
| DNS 解決 | ✅ `bun:dns` / `node:dns` |

**framer-framer との互換性**: 完全互換。npm パッケージとしてそのまま利用可能。

### fetch API の差異

| 項目 | Node.js (undici) | Cloudflare Workers | Deno | Bun |
|------|-----------------|-------------------|------|-----|
| `fetch()` | ✅ | ✅ | ✅ | ✅ |
| `AbortSignal.timeout()` | ✅ | ✅ | ✅ | ✅ |
| `Response.json()` | ✅ | ✅ | ✅ | ✅ |
| `Response.text()` | ✅ | ✅ | ✅ | ✅ |
| リダイレクト追従 | ✅ (デフォルト) | ✅ (デフォルト) | ✅ (デフォルト) | ✅ (デフォルト) |
| gzip / brotli 解凍 | ✅ (自動) | ✅ (自動) | ✅ (自動) | ✅ (自動) |

**結論**: framer-framer が使用する `fetch` API の機能は全ランタイムで統一的にサポートされている。ポリフィルは不要。

### サーバーコンポーネントの互換性

Hono フレームワークは公式に以下のランタイムをサポートしている:

- Cloudflare Workers / Pages
- Deno / Deno Deploy
- Bun
- Node.js
- AWS Lambda
- Fastly Compute

`src/server.ts` の `createApp()` は `Hono` インスタンスを返すため、各ランタイム固有のサーバー起動コードのみが異なる:

```typescript
// Node.js
import { serve } from "@hono/node-server";
serve({ fetch: app.fetch, port: 3000 });

// Cloudflare Workers
export default app;

// Deno
Deno.serve({ port: 3000 }, app.fetch);

// Bun
export default { port: 3000, fetch: app.fetch };
```

**注意点**: レートリミッターの `setInterval` cleanup は Cloudflare Workers ではインスタンス間で共有されないため、Workers 環境では KV ベースのレートリミッターを検討する必要がある。ただし、これは設計の範囲であり現行の機能は正常に動作する。

## 4. 外部ロガー・テレメトリ対応の設計

### 現状分析

現在のロガー (`src/utils/logger.ts`):

- `Logger` インターフェース (`debug`, `info`, `warn`, `error`)
- 構造化ログエントリー (`LogEntry`)
- 組み込み JSON ロガー (`createLogger()`) — stderr に JSON 出力
- `EmbedOptions.logger` で注入可能

### 外部ロガー統合

現在の `Logger` インターフェースは十分に汎用的であり、外部ロガーのラッパーとして利用できる:

```typescript
// pino との統合例
import pino from "pino";

const pinoLogger = pino();
const logger: Logger = {
  debug: (entry) => pinoLogger.debug(entry, entry.message),
  info:  (entry) => pinoLogger.info(entry, entry.message),
  warn:  (entry) => pinoLogger.warn(entry, entry.message),
  error: (entry) => pinoLogger.error(entry, entry.message),
};

await embed(url, { logger });
```

```typescript
// winston との統合例
import winston from "winston";

const winstonLogger = winston.createLogger({ /* ... */ });
const logger: Logger = {
  debug: (entry) => winstonLogger.debug(entry.message, entry),
  info:  (entry) => winstonLogger.info(entry.message, entry),
  warn:  (entry) => winstonLogger.warn(entry.message, entry),
  error: (entry) => winstonLogger.error(entry.message, entry),
};

await embed(url, { logger });
```

**設計判断**: 現在の `Logger` インターフェースは変更不要。ドキュメントに統合例を追加するのみで十分。

### OpenTelemetry 統合の実現可能性

現在の `MetricsCallback` (`src/types.ts`) は解決ごとに以下を報告する:

```typescript
interface MetricsEvent {
  url: string;
  provider: string;
  duration: number;
  success: boolean;
  cacheHit: boolean;
  errorCode?: string;
}
```

OpenTelemetry (OTel) 統合は、この既存メカニズムの上に構築可能:

```typescript
// OTel 統合例（ユーザーランドで実装可能）
import { metrics, trace } from "@opentelemetry/api";

const meter = metrics.getMeter("framer-framer");
const tracer = trace.getTracer("framer-framer");

const histogram = meter.createHistogram("embed.duration", {
  unit: "ms",
  description: "Embed resolution duration",
});

const counter = meter.createCounter("embed.requests", {
  description: "Total embed resolution requests",
});

onMetrics((event) => {
  counter.add(1, {
    provider: event.provider,
    success: String(event.success),
    cacheHit: String(event.cacheHit),
  });
  histogram.record(event.duration, {
    provider: event.provider,
  });
});
```

**設計判断**: OpenTelemetry のネイティブ統合は **v3.2.0 スコープ外** とする。

理由:
1. `onMetrics()` + `Logger` で既にユーザーランドでの OTel 統合が可能
2. `@opentelemetry/api` を依存に追加するとバンドルサイズが増加する
3. Edge ランタイムでの OTel SDK サポートはまだ成熟していない

将来的にネイティブ統合を行う場合は、optional peerDependency として `@opentelemetry/api` を追加し、`createOTelLogger()` / `createOTelMetrics()` ヘルパーを提供する形を推奨する。

## 5. バージョニング判断

### 変更の分類

| 変更内容 | 破壊的か | 理由 |
|---------|---------|------|
| `CacheAdapter` インターフェースの追加 | ❌ | 新しい型の追加のみ |
| `EmbedOptions.cache` の型拡張 | ❌ | 既存の `EmbedCache` は引き続きサポート |
| `MemoryCacheAdapter` の追加 | ❌ | 新しいクラスの追加のみ |
| `UrlValidator` インターフェースの追加 | ❌ | 新しい型の追加のみ |
| `EmbedCache` の deprecated 化 | ❌ | 既存の動作は維持 |
| `EmbedCache` の削除 | ✅ | 既存利用者のコードが壊れる |
| `cache` オプションの型変更（`EmbedCache` 除去） | ✅ | 既存利用者のコードが壊れる |

### 推奨バージョニング

**v3.2.0** (非破壊的変更のみ):
- `CacheAdapter` インターフェースの追加
- `MemoryCacheAdapter` の追加
- `EmbedOptions.cache` の型を `EmbedCache | CacheAdapter | false` に拡張
- `EmbedCache` クラスを `@deprecated` マーク
- `UrlValidator` インターフェースの追加
- `StringUrlValidator`, `DnsUrlValidator` の追加
- ドキュメント追加（外部ロガー統合例、OTel 統合例）

**v4.0.0** (破壊的変更を含む):
- `EmbedCache` クラスの削除
- `cache` オプションの型を `CacheAdapter | false` に変更
- `EmbedOptions.meta` (deprecated) の削除
- `resolve()` 関数 (deprecated alias) の削除

### v4.0.0 移行パス

1. **v3.2.0 リリース時**: deprecation warning をドキュメントと JSDoc に記載。`EmbedCache` を使用しているユーザーに `MemoryCacheAdapter` への移行を案内
2. **v3.2.x 期間**: 移行ガイドを `docs/migration-v4.md` に用意
3. **v4.0.0 リリース時**: deprecated API を削除

```typescript
// v3.2.0: 移行例
// Before (v3.1.x)
import { createCache, embed } from "framer-framer";
const cache = createCache({ maxSize: 200, ttl: 60_000 });
await embed(url, { cache });

// After (v3.2.0+, recommended)
import { MemoryCacheAdapter, embed } from "framer-framer";
const cache = new MemoryCacheAdapter({ maxSize: 200, ttl: 60_000 });
await embed(url, { cache });
```

## 設計判断サマリー

| # | 質問 | 採用した方針 | 理由 |
|---|------|-------------|------|
| 1 | キャッシュアダプターのインターフェースは同期 API か非同期 API か | 非同期 API | Redis / KV 等の外部キャッシュが非同期 I/O を必要とするため。embed 解決自体がネットワーク I/O を伴うため、Promise のオーバーヘッドは無視できる |
| 2 | SSRF チェックを Edge ランタイムで行う代替手段 | 現行の文字列ベース検証を維持 + オプショナルな DNS 解決バリデーターを設計 | 現行コードに `node:net` 依存がなく既に Edge 互換。DNS 解決は Node.js / Deno / Bun でのみオプション提供 |
| 3 | OpenTelemetry は v3.2.0 スコープに含めるか | 設計ドキュメントに記載するのみ。実装は別 Phase に分離 | 既存の `onMetrics()` + `Logger` でユーザーランド統合が可能。Edge ランタイムでの OTel SDK サポートが未成熟 |
| 4 | 破壊的変更を伴う場合の v4.0.0 移行パス | v3.2.0 で非破壊的に新 API を追加し旧 API を deprecated 化。v4.0.0 で旧 API を削除 | 段階的移行によりユーザーへの影響を最小化 |
