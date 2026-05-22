# R2フィクスチャによるローカルシード実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** R2から100件のアイドルプロフィールをローカルファイルに保存し、`db:seed:local`コマンドでそのデータをローカルSQLiteDBに投入できるようにする。

**Architecture:** scraperパッケージに`fetch-seed-fixtures.ts`スクリプトを追加し、R2の`idols/*/profile.json`を最大100件取得して`packages/db/src/fixtures/seed-data.json`に保存する。`seed-local.ts`はハードコードのダミーデータを捨て、そのフィクスチャファイルを読み込んで実データを投入する。フィクスチャファイルはgitにコミットするため、R2へのアクセス権がない開発者でも再利用できる。

**Tech Stack:** Bun, TypeScript, @aws-sdk/client-s3 (scraperパッケージに既存), libsql + drizzle-orm (dbパッケージに既存)

---

## File Map

| 操作   | パス                                          | 責務                                                              |
| ------ | --------------------------------------------- | ----------------------------------------------------------------- |
| Delete | `packages/db/src/seed.ts`                     | 不要なseed（ハードコードダミーデータ）                            |
| Create | `packages/db/src/fixtures/seed-data.json`     | フェッチ済みR2データのローカルキャッシュ                          |
| Modify | `packages/db/src/seed-local.ts`               | フィクスチャファイルからDBへ投入するスクリプト                    |
| Create | `packages/scraper/src/fetch-seed-fixtures.ts` | R2からデータを取得してfixtures/seed-data.jsonに保存するスクリプト |
| Modify | `packages/scraper/package.json`               | `fetch-seed-fixtures`スクリプトを追加                             |
| Modify | `package.json` (root)                         | `db:fetch-seed-data`スクリプトを追加                              |

---

### Task 1: seed.ts を削除する

**Files:**

- Delete: `packages/db/src/seed.ts`

- [ ] **Step 1: ファイルを削除する**

```bash
rm packages/db/src/seed.ts
```

- [ ] **Step 2: どこからもimportされていないことを確認する**

```bash
grep -r "seed\.ts\|from.*\/seed\"" packages/ --include="*.ts" | grep -v "seed-local"
```

Expected: 出力なし

- [ ] **Step 3: コミット**

```bash
git add packages/db/src/seed.ts
git commit -m "chore: delete unused seed.ts"
```

---

### Task 2: フィクスチャプレースホルダーを作成し、seed-local.ts を更新する

**Files:**

- Create: `packages/db/src/fixtures/seed-data.json`
- Modify: `packages/db/src/seed-local.ts`

- [ ] **Step 1: fixtures ディレクトリとプレースホルダーを作成する**

```bash
mkdir -p packages/db/src/fixtures
echo '[]' > packages/db/src/fixtures/seed-data.json
```

- [ ] **Step 2: `packages/db/src/seed-local.ts` を以下の内容で置き換える**

```typescript
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { idolPhotos } from "./schema/idol_photos";
import { idols } from "./schema/idols";

type SeedEntry = {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ imageUrl: string }>;
};

const fixturesPath = resolve(import.meta.dirname, "fixtures/seed-data.json");
const SEED_DATA: SeedEntry[] = JSON.parse(readFileSync(fixturesPath, "utf-8")) as SeedEntry[];

if (SEED_DATA.length === 0) {
  console.log("シードデータがありません。先に `bun run db:fetch-seed-data` を実行してください。");
  process.exit(0);
}

const d1Dir = resolve(
  import.meta.dirname,
  "../../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

const sqliteFiles = readdirSync(d1Dir).filter(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);

if (sqliteFiles.length === 0) {
  throw new Error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
}

async function seedFile(filePath: string): Promise<void> {
  const client = createClient({ url: `file:${filePath}` });
  const db = drizzle(client, { schema });

  try {
    const existing = await db.select().from(idols).limit(1);
    if (existing.length > 0) {
      console.log(`スキップ: ${filePath} (既にデータあり)`);
      return;
    }

    for (const entry of SEED_DATA) {
      const [inserted] = await db
        .insert(idols)
        .values({ naviIdolId: entry.naviIdolId, name: entry.name, group: entry.group })
        .returning();

      if (entry.images.length > 0) {
        await db.insert(idolPhotos).values(
          entry.images.map((img, index) => ({
            idolId: inserted!.id,
            imageUrl: img.imageUrl,
            sortOrder: index,
          })),
        );
      }
    }

    console.log(`${SEED_DATA.length} 件シード完了: ${filePath}`);
  } finally {
    client.close();
  }
}

for (const file of sqliteFiles) {
  await seedFile(join(d1Dir, file));
}
```

- [ ] **Step 3: 型チェックが通ることを確認する**

```bash
cd packages/db && bun run check-types
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add packages/db/src/fixtures/seed-data.json packages/db/src/seed-local.ts
git commit -m "feat: seed-local をフィクスチャファイルから読み込む形に変更"
```

---

### Task 3: fetch-seed-fixtures.ts を scraper パッケージに作成する

**Files:**

- Create: `packages/scraper/src/fetch-seed-fixtures.ts`

- [ ] **Step 1: `packages/scraper/src/fetch-seed-fixtures.ts` を以下の内容で作成する**

```typescript
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import dotenv from "dotenv";

import { getJson, listKeys } from "./r2";

dotenv.config();

const MAX_PROFILES = 100;

interface ProfileJson {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ key: string; originalUrl: string }>;
}

type SeedEntry = {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ imageUrl: string }>;
};

const r2PublicUrl = process.env.R2_PUBLIC_URL;
if (!r2PublicUrl) {
  throw new Error("R2_PUBLIC_URL が設定されていません (.env を確認してください)");
}

async function main(): Promise<void> {
  console.log("R2 からアイドルプロフィールを取得中...");

  const allKeys = await listKeys("idols/");
  const profileKeys = allKeys.filter((k) => k.endsWith("/profile.json")).slice(0, MAX_PROFILES);

  console.log(`${profileKeys.length} 件のプロフィールを取得します`);

  const entries: SeedEntry[] = [];

  for (const key of profileKeys) {
    try {
      const profile = await getJson<ProfileJson>(key);
      entries.push({
        naviIdolId: profile.naviIdolId,
        name: profile.name,
        group: profile.group,
        images: profile.images.map((img) => ({
          imageUrl: `${r2PublicUrl}/${img.key}`,
        })),
      });
      console.log(`  取得: ${profile.name} (${profile.group})`);
    } catch (err) {
      console.warn(`  スキップ: ${key}`, err);
    }
  }

  const outputDir = resolve(import.meta.dirname, "../../db/src/fixtures");
  const outputPath = resolve(outputDir, "seed-data.json");

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(entries, null, 2) + "\n");

  console.log(`\n${entries.length} 件を保存: ${outputPath}`);
}

main().catch(console.error);
```

- [ ] **Step 2: 型チェックが通ることを確認する**

```bash
cd packages/scraper && bun run check-types
```

Expected: エラーなし

---

### Task 4: package.json にスクリプトを追加する

**Files:**

- Modify: `packages/scraper/package.json` の `"scripts"` セクション
- Modify: `package.json` (root) の `"scripts"` セクション

- [ ] **Step 1: `packages/scraper/package.json` に `fetch-seed-fixtures` スクリプトを追加する**

`"scripts"` オブジェクトに以下を追加:

```json
"fetch-seed-fixtures": "bun run src/fetch-seed-fixtures.ts"
```

- [ ] **Step 2: root `package.json` に `db:fetch-seed-data` スクリプトを追加する**

`"scripts"` オブジェクトに以下を追加:

```json
"db:fetch-seed-data": "turbo -F @oshi-idol/scraper fetch-seed-fixtures"
```

- [ ] **Step 3: lintと型チェックが通ることを確認する**

```bash
bun run check && bun run check-types
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add packages/scraper/src/fetch-seed-fixtures.ts packages/scraper/package.json package.json
git commit -m "feat: R2 からシードデータを取得する fetch-seed-fixtures スクリプトを追加"
```

---

### Task 5: フェッチスクリプトを実行してフィクスチャを生成する

**前提条件:** `packages/scraper/.env` に R2 の認証情報が設定されていること

- [ ] **Step 1: R2認証情報が設定されていることを確認する**

```bash
grep -E "^R2_ACCOUNT_ID=.+|^R2_ACCESS_KEY_ID=.+|^R2_PUBLIC_URL=.+" packages/scraper/.env
```

Expected: 3行が表示される（値が空でない）

- [ ] **Step 2: フェッチスクリプトを実行する**

```bash
bun run db:fetch-seed-data
```

Expected: `N 件を保存: .../packages/db/src/fixtures/seed-data.json` が表示される

- [ ] **Step 3: フィクスチャファイルの内容を確認する**

```bash
jq 'length' packages/db/src/fixtures/seed-data.json
jq '.[0]' packages/db/src/fixtures/seed-data.json
```

Expected: 1行目に件数（1〜100）、続いて最初のエントリ（naviIdolId, name, group, images を含む）が表示される

- [ ] **Step 4: フィクスチャをコミットする**

```bash
git add packages/db/src/fixtures/seed-data.json
git commit -m "chore: R2 から取得したシードデータを追加"
```

---

### Task 6: 全体確認とPR作成

- [ ] **Step 1: すべてのチェックを実行する**

```bash
bun run check && bun run check-types && bun run test && bun run build
```

Expected: すべてパス

- [ ] **Step 2: dev サーバー起動確認**

```bash
(cd packages/infra && timeout 30 bun run dev 2>&1 || true) | grep -vE "SIGTERM|Polite quit"
```

Expected: `error:` / `AssertionError` / `command not found` が含まれない

- [ ] **Step 3: PR作成**

```bash
gh pr create --title "feat: db:seed:local で R2 から取得した実データを投入できるようにする" --body "$(cat <<'EOF'
## Summary
- R2 の `idols/*/profile.json` から最大 100 件を取得し `packages/db/src/fixtures/seed-data.json` に保存するスクリプト (`fetch-seed-fixtures`) を scraper パッケージに追加
- `db:seed:local` がそのフィクスチャファイルを読み込んでローカル D1 SQLite に投入するよう `seed-local.ts` を更新
- 不要になった `packages/db/src/seed.ts` を削除
- `bun run db:fetch-seed-data` コマンドを root に追加（R2 認証情報が必要、一度実行してコミットすれば以降は不要）

## Test plan
- [ ] `bun run check && bun run check-types && bun run test && bun run build` がパスすること
- [ ] `bun run db:fetch-seed-data` 実行後、`packages/db/src/fixtures/seed-data.json` に 1〜100 件のデータが書き込まれること
- [ ] `bun run db:seed:local` 実行後、ローカル D1 にアイドルと写真データが投入されること

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL が表示される
