# Vote IP Address Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vote実行時にクライアントのIPアドレスを `votes` テーブルの `ip_address` カラムに保存する

**Architecture:** `packages/db/src/schema/idols.ts` 内の `votes` テーブルに nullable な `ip_address` カラムを追加し、tRPC context で Cloudflare の `CF-Connecting-IP` ヘッダーからIPを取得して `votes.submit` mutation で保存する。

**Tech Stack:** Drizzle ORM (SQLite/D1), drizzle-kit, tRPC, Cloudflare Workers, Vitest

---

## ファイル構成

| ファイル                                           | 変更                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| `packages/db/src/schema/idols.ts`                  | `votes` テーブルに `ipAddress` カラム追加               |
| `packages/db/src/migrations/*.sql`                 | `bun run db:generate`（packages/db から実行）で自動生成 |
| `packages/api/src/context.ts`                      | `ipAddress` フィールドを追加                            |
| `packages/api/src/routers/votes.ts`                | insert に `ipAddress: ctx.ipAddress` を追加             |
| `packages/api/src/routers/__tests__/votes.test.ts` | caller に `ipAddress` 追加、IP保存テスト追加            |

---

### Task 1: votes スキーマに ip_address カラム追加 + マイグレーション生成

**Files:**

- Modify: `packages/db/src/schema/idols.ts`
- Generate: `packages/db/src/migrations/*.sql`

- [ ] **Step 1: ip_address カラムをスキーマに追加**

`packages/db/src/schema/idols.ts` の `votes` テーブル定義で `sessionId` の直後に追加する:

```ts
// sessionId の直後に追加
ipAddress: text("ip_address"),
```

変更後の `votes` テーブル定義（`votes = sqliteTable("votes", { ... })` の中身）:

```ts
id: text("id")
  .$defaultFn(() => createId())
  .primaryKey(),
winnerId: text("winner_id")
  .notNull()
  .references(() => idols.id),
loserId: text("loser_id")
  .notNull()
  .references(() => idols.id),
winnerPhotoId: text("winner_photo_id")
  .notNull()
  .references(() => idolPhotos.id),
loserPhotoId: text("loser_photo_id")
  .notNull()
  .references(() => idolPhotos.id),
sessionId: text("session_id").notNull(),
ipAddress: text("ip_address"),
createdAt: integer("created_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .notNull(),
updatedAt: integer("updated_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .$onUpdate(() => new Date())
  .notNull(),
```

- [ ] **Step 2: マイグレーションを生成**

```bash
cd packages/db && bun run db:generate
```

Expected: `packages/db/src/migrations/` に新しい `.sql` ファイルが生成される。インタラクティブな質問が出た場合はユーザーに確認を求める。

- [ ] **Step 3: 生成されたマイグレーションの内容を確認**

```bash
cat packages/db/src/migrations/$(ls packages/db/src/migrations/*.sql | tail -1 | xargs basename)
```

`ALTER TABLE \`votes\` ADD \`ip_address\` text;` が含まれていることを確認する。

- [ ] **Step 4: コミット**

```bash
git add packages/db/src/schema/idols.ts packages/db/src/migrations/
git commit -m "feat: votes テーブルに ip_address カラムを追加"
```

---

### Task 2: Context に ipAddress を追加

**Files:**

- Modify: `packages/api/src/context.ts`

- [ ] **Step 1: ipAddress 抽出ロジックを追加**

`packages/api/src/context.ts` を以下に書き換える:

```ts
import { createAuth } from "@oshi-idol/auth";
import { createDb } from "@oshi-idol/db";

export async function createContext({ req }: { req: Request }) {
  const session = await createAuth().api.getSession({
    headers: req.headers,
  });
  const ipAddress =
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    null;
  return {
    auth: null,
    session,
    db: createDb(),
    ipAddress,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 2: 型チェック**

```bash
bun run check-types
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add packages/api/src/context.ts
git commit -m "feat: tRPC context に ipAddress を追加"
```

---

### Task 3: votes.submit で ipAddress を保存（テスト先行）

**Files:**

- Modify: `packages/api/src/routers/__tests__/votes.test.ts`
- Modify: `packages/api/src/routers/votes.ts`

- [ ] **Step 1: 失敗するテストを書く**

`packages/api/src/routers/__tests__/votes.test.ts` を以下に全置換する:

```ts
import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols, votes } from "@oshi-idol/db/schema/idols";
import { eq } from "drizzle-orm";

import { t } from "../../index";
import { votesRouter } from "../votes";

const createCaller = t.createCallerFactory(votesRouter);

describe("votes.submit", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = getTestDb();
    await runMigrations(db);
  });

  test("投票を送信するとレーティングが更新され投票レコードが作成される", async () => {
    const [winner] = await db
      .insert(idols)
      .values({ name: "アイドルA", group: "グループA", eloRating: 1500, wins: 0, losses: 0 })
      .returning();

    const [loser] = await db
      .insert(idols)
      .values({ name: "アイドルB", group: "グループB", eloRating: 1400, wins: 0, losses: 0 })
      .returning();

    const [winnerPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: winner!.id, imageUrl: "https://example.com/a.jpg" })
      .returning();

    const [loserPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: loser!.id, imageUrl: "https://example.com/b.jpg" })
      .returning();

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });

    const result = await caller.submit({
      winnerId: winner!.id,
      loserId: loser!.id,
      winnerPhotoId: winnerPhoto!.id,
      loserPhotoId: loserPhoto!.id,
      sessionId: "test-session",
    });

    expect(result).toEqual({ success: true });

    const updatedWinner = await db.query.idols.findFirst({
      where: eq(idols.id, winner!.id),
    });
    expect(updatedWinner!.wins).toBe(1);
    expect(updatedWinner!.eloRating).toBeGreaterThan(1500);

    const updatedLoser = await db.query.idols.findFirst({
      where: eq(idols.id, loser!.id),
    });
    expect(updatedLoser!.losses).toBe(1);
    expect(updatedLoser!.eloRating).toBeLessThan(1400);
  });

  test("投票を送信するとIPアドレスが記録される", async () => {
    const [winner] = await db
      .insert(idols)
      .values({ name: "アイドルC", group: "グループC", eloRating: 1500, wins: 0, losses: 0 })
      .returning();

    const [loser] = await db
      .insert(idols)
      .values({ name: "アイドルD", group: "グループD", eloRating: 1400, wins: 0, losses: 0 })
      .returning();

    const [winnerPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: winner!.id, imageUrl: "https://example.com/c.jpg" })
      .returning();

    const [loserPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: loser!.id, imageUrl: "https://example.com/d.jpg" })
      .returning();

    const caller = createCaller({ auth: null, session: null, db, ipAddress: "203.0.113.1" });

    await caller.submit({
      winnerId: winner!.id,
      loserId: loser!.id,
      winnerPhotoId: winnerPhoto!.id,
      loserPhotoId: loserPhoto!.id,
      sessionId: "test-session-ip",
    });

    const [vote] = await db.select().from(votes).where(eq(votes.sessionId, "test-session-ip"));

    expect(vote!.ipAddress).toBe("203.0.113.1");
  });

  test("winner が見つからない場合は NOT_FOUND エラーになる", async () => {
    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });

    await expect(
      caller.submit({
        winnerId: "nonexistent-id",
        loserId: "another-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
        sessionId: "test-session",
      }),
    ).rejects.toThrow("Winner not found");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
bun run test packages/api/src/routers/__tests__/votes.test.ts
```

Expected: "投票を送信するとIPアドレスが記録される" が FAIL（`ipAddress` が `votes` テーブルに渡されていないため）

- [ ] **Step 3: votes.submit に ipAddress を追加**

`packages/api/src/routers/votes.ts` の `db.insert(votes).values(...)` を以下に変更:

```ts
db.insert(votes).values({
  winnerId: input.winnerId,
  loserId: input.loserId,
  winnerPhotoId: input.winnerPhotoId,
  loserPhotoId: input.loserPhotoId,
  sessionId: input.sessionId,
  ipAddress: ctx.ipAddress,
}),
```

- [ ] **Step 4: テストがすべてパスすることを確認**

```bash
bun run test packages/api/src/routers/__tests__/votes.test.ts
```

Expected: 3件すべて PASS

- [ ] **Step 5: 全チェック実行**

```bash
bun run check && bun run check-types && bun run test && bun run build
```

Expected: すべてグリーン

- [ ] **Step 6: dev サーバー起動確認**

```bash
(cd packages/infra && timeout 30 bun run dev 2>&1 || true) | grep -vE "SIGTERM|Polite quit"
```

Expected: `error:` / `AssertionError` / `command not found` が含まれていないこと

- [ ] **Step 7: コミット**

```bash
git add packages/api/src/routers/votes.ts packages/api/src/routers/__tests__/votes.test.ts
git commit -m "feat: vote 送信時に IP アドレスを DB に保存する"
```

---

### Task 4: PR 作成・マージ

- [ ] **Step 1: プッシュ**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: PR 作成**

```bash
gh pr create --title "feat: vote実行時のIPアドレスをDBに収集" --body "$(cat <<'EOF'
## Summary
- `votes` テーブルに `ip_address` カラム（nullable text）を追加
- tRPC context で `CF-Connecting-IP` → `X-Forwarded-For` の順にIPを取得
- `votes.submit` mutation で投票時にIPアドレスを保存

## Test plan
- [x] 投票送信時にIPアドレスが `votes` テーブルに記録されることを確認（テスト追加）
- [x] IPが取得できない場合（null）でも投票が正常に完了することを確認
- [x] 全チェック（check / check-types / test / build）がグリーン

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: レビュー・マージ**

サブエージェントによるレビューと修正が完了したら:

```bash
gh pr merge --merge --delete-branch
```
