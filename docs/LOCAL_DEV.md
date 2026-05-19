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
