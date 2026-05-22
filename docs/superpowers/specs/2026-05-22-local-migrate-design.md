# ローカルマイグレーションコマンド設計

## 背景

ルートの `db:migrate:local` コマンドは `.alchemy/local/wrangler.jsonc` に依存しているが、このファイルは Alchemy が `bun run dev` 実行時に生成するため、新鮮な環境では存在せずコマンドが失敗する。

## 目標

`.alchemy/local/wrangler.jsonc` に依存せず、dev サーバーが管理するローカル D1 SQLite に対してマイグレーションを適用できるコマンドを作る。

## 設計

### アプローチ

カスタム Bun スクリプト（`packages/db/src/migrate-local.ts`）を用意し、`@libsql/client` でミニフレアの SQLite ファイルを直接操作する。

マイグレーションのトラッキングは Wrangler / `@cloudflare/vite-plugin` と同じ `d1_migrations` テーブルを使う。これにより dev サーバーが適用済みのマイグレーションと競合しない。

### ファイル構成

| ファイル                           | 変更                                        |
| ---------------------------------- | ------------------------------------------- |
| `packages/db/src/migrate-local.ts` | 新規作成                                    |
| `packages/db/package.json`         | `db:migrate:local` スクリプト追加           |
| `package.json`（ルート）           | `db:migrate:local` を新スクリプトに置き換え |

### `migrate-local.ts` の処理フロー

1. `.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject/` から `.sqlite` ファイルを探す（`metadata.sqlite` を除く）
2. 見つからなければエラーメッセージを出して終了
3. `@libsql/client` で SQLite に接続
4. `d1_migrations` テーブルを `CREATE TABLE IF NOT EXISTS` で作成
5. 適用済みファイル名を `SELECT name FROM d1_migrations` で取得
6. `src/migrations/*.sql` をソート順に列挙
7. 未適用のものだけ `--> statement-breakpoint` で分割して逐次実行
8. 実行後、`d1_migrations` に `INSERT`
9. 適用数を出力して終了

### root の変更

```json
// 変更前
"db:migrate:local": "cd apps/web && npx wrangler d1 migrations apply oshi-idol-db-local --local --config .alchemy/local/wrangler.jsonc"

// 変更後
"db:migrate:local": "turbo -F @oshi-idol/db db:migrate:local"
```

## 制約・前提

- **初回起動前は使用不可**: SQLite は `bun run dev` 初回実行時に作成される。それ以前は接続できず、エラーメッセージを出して終了する。
- **dev サーバー起動中の反映**: Miniflare はメモリキャッシュのため、起動中に SQLite を変更しても再起動まで反映されない（既存挙動と同じ）。

## テスト方針

手動テストのみ（スクリプト自体のユニットテストはなし）:

1. `bun run db:migrate:local` を実行して「No new migrations.」が出力されること
2. 新しいマイグレーションファイルを追加後、「Applied 1 migration(s).」が出力されること
3. 再度実行して「No new migrations.」が出力されること（冪等性）
