# ローカルマイグレーションコマンド 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.alchemy/local/wrangler.jsonc` に依存しない `bun run db:migrate:local` コマンドを作る

**Architecture:** `packages/db/src/migrate-local.ts` を Bun スクリプトとして作成し、`@libsql/client` でミニフレアの SQLite に直接接続する。マイグレーション追跡は Wrangler と同じ `d1_migrations` テーブルを使う。

**Tech Stack:** Bun, `@libsql/client`（既に依存関係に含まれる）, Node.js `fs`/`path`

---

## ファイルマップ

| ファイル                           | 操作                                  |
| ---------------------------------- | ------------------------------------- |
| `packages/db/src/migrate-local.ts` | 新規作成                              |
| `packages/db/package.json`         | `db:migrate:local` スクリプトを追加   |
| `package.json`（ルート）           | `db:migrate:local` を新実装に差し替え |

---

### Task 1: `migrate-local.ts` を作成する

**Files:**

- Create: `packages/db/src/migrate-local.ts`

- [ ] **Step 1: ファイルを作成する**

`packages/db/src/migrate-local.ts` を以下の内容で作成する:

```ts
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const d1Dir = resolve(
  import.meta.dirname,
  "../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

let sqliteFile: string | undefined;
try {
  sqliteFile = readdirSync(d1Dir).find((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
} catch {
  // ディレクトリが存在しない場合
}

if (!sqliteFile) {
  console.error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
  process.exit(1);
}

const client = createClient({ url: `file:${join(d1Dir, sqliteFile)}` });

await client.execute(`
  CREATE TABLE IF NOT EXISTS d1_migrations (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const result = await client.execute("SELECT name FROM d1_migrations");
const appliedNames = new Set(result.rows.map((r) => r.name as string));

const migrationsDir = resolve(import.meta.dirname, "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
for (const file of files) {
  if (appliedNames.has(file)) continue;

  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  console.log(`Applying ${file}...`);

  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  await client.execute({
    sql: "INSERT INTO d1_migrations (name) VALUES (?)",
    args: [file],
  });

  count++;
}

console.log(count === 0 ? "No new migrations." : `Applied ${count} migration(s).`);

await client.close();
```

- [ ] **Step 2: `packages/db/package.json` に `db:migrate:local` スクリプトを追加する**

`packages/db/package.json` の `scripts` に以下を追加する:

```json
"db:migrate:local": "bun run src/migrate-local.ts"
```

追加後の `scripts` セクション:

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:studio": "drizzle-kit studio --config drizzle.local.config.ts",
  "db:migrate": "drizzle-kit migrate",
  "db:migrate:local": "bun run src/migrate-local.ts",
  "db:seed:local": "bun run src/seed-local.ts"
}
```

- [ ] **Step 3: ルート `package.json` の `db:migrate:local` を差し替える**

ルートの `package.json` の `scripts.db:migrate:local` を以下に変更する:

変更前:

```json
"db:migrate:local": "cd apps/web && npx wrangler d1 migrations apply oshi-idol-db-local --local --config .alchemy/local/wrangler.jsonc"
```

変更後:

```json
"db:migrate:local": "turbo -F @oshi-idol/db db:migrate:local"
```

- [ ] **Step 4: 型チェックと lint を通す**

```bash
bun run check
bun run check-types
```

エラーが出たら修正する。`migrate-local.ts` で型エラーが出る場合、`@libsql/client` の型定義を確認する。

- [ ] **Step 5: ビルド確認**

```bash
bun run build
```

- [ ] **Step 6: dev 起動確認**

```bash
(cd packages/infra && timeout 30 bun run dev 2>&1 || true) | grep -vE "SIGTERM|Polite quit"
```

`error:` / `AssertionError` / `command not found` が含まれていないことを確認する。

- [ ] **Step 7: コミット・プッシュ・PR作成**

```bash
git add packages/db/src/migrate-local.ts packages/db/package.json package.json
git commit -m "feat: ローカル D1 マイグレーションコマンドを追加"
git push -u origin main
gh pr create --title "feat: ローカル D1 マイグレーションコマンドを追加" --body "$(cat <<'EOF'
## Summary
- `.alchemy/local/wrangler.jsonc` に依存せず動く `bun run db:migrate:local` コマンドを追加
- `@libsql/client` でミニフレアの SQLite に直接接続し、`d1_migrations` テーブルで wrangler と互換のトラッキングを行う

## Test plan
- [ ] `bun run db:migrate:local` を実行して「No new migrations.」が出力されることを確認
- [ ] `bun run check` / `bun run check-types` / `bun run build` がグリーン

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR 作成後、サブエージェントによるレビューが完了したら `gh pr merge --merge --delete-branch` でマージする。
