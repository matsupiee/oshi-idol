# ローカル開発

## 初回セットアップ

1. 依存関係インストール

```
bun install
```

2. 開発サーバーを起動し、DB を初期化

```bash
bun run dev
# DB が初期化されたら Ctrl+C で停止
```

`@cloudflare/vite-plugin` がマイグレーションを自動適用するため、`bun run dev` を一度実行するだけで DB スキーマが適用されます。

3. テストデータを投入

```bash
bun run db:seed:local
```

4. 開発サーバーを再起動

```bash
bun run dev
```

ブラウザで http://localhost:3001 を開くとアプリを確認できます。

> **なぜ再起動が必要か**
> Miniflare は起動時に SQLite をメモリに読み込むため、`db:seed:local` のように SQLite ファイルへ直接書き込んでも起動中は反映されません。再起動することで新しいデータが読み込まれます。
> UI や API 経由の操作（投票・データ追加など）は Miniflare ランタイムを通るため、再起動なしで即時反映されます。

## DBについて

- 本番では **Cloudflare D1** を DB として使います
- ローカルでは `@cloudflare/vite-plugin` が Miniflare 経由で D1 をエミュレートします
- DB ファイルは `.alchemy/miniflare/v3/d1/` 配下に SQLite として保存されます
- `bun run dev` を停止してもデータは消えず残り続けます
- ローカルの DB 名は `oshi-idol-db-local`、本番は `oshi-idol-db`（`alchemy dev` / `alchemy deploy` で自動的に切り替わる）
- `packages/infra` の `alchemy dev` はローカルファイル状態ストアを使うため、CloudflareStateStore 用の `ALCHEMY_STATE_TOKEN` は不要です
- `.env` が未作成でも `alchemy dev` は `http://localhost:3001` とローカル用の Better Auth secret を既定値として使います。本番 deploy では `CORS_ORIGIN` / `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` を必ず設定してください
- `bun run db:push` は Cloudflare のリモート D1 API に接続するため、ローカル開発には使えません

## スキーマ変更時

1. `packages/db/src/schema/` の Drizzle スキーマを編集
2. マイグレーションファイルを生成

```bash
bun run db:generate
```

3. 開発サーバーを再起動（自動適用される）

```bash
bun run dev
```

## DB の操作

### データ閲覧（Drizzle Studio）

dev サーバーを停止した状態で実行してください。

```bash
bun run db:studio
```

### リセット

`.alchemy/miniflare/v3/d1/` 配下の SQLite ファイル（`metadata.sqlite` 以外）を削除してから `bun run dev` を再起動。

## テスト

### フロントエンド統合テスト（apps/web）

`apps/web` の画面ロジックは [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro) で統合テストする。

```bash
# 一括実行（turbo 経由）
bun run test

# パッケージ単体 / watch
cd apps/web && bun run test
cd apps/web && bun run test:watch
```

- テストは `apps/web/src/routes/__tests__/` 配下に配置する（`__` プレフィックスは TanStack Router がルートとして拾わないため安全）。
- ルートコンポーネント（`HomeComponent` / `BattleComponent` / `RankingComponent`）は名前付き export し、テストから直接 import する。
- tRPC とルーターは `vi.mock` で差し替え、`renderWithProviders`（`src/test/helpers.tsx`）で `QueryClient` を渡してレンダリングする。tRPC のレスポンスは各テストの内側で `mockResolvedValue` でインラインに定義する（ヘルパー禁止方針に従う）。
- DOM 環境は `jsdom`、共通の前処理は `src/test/setup.ts`（`@testing-library/jest-dom` 登録、`matchMedia` / `crypto.randomUUID` の polyfill、テスト後の `cleanup`）に集約。
