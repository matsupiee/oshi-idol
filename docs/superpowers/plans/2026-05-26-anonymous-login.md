# Anonymous Login 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** better-auth の anonymous plugin を使って、localStorage の sessionId を Cookie ベースの匿名ユーザーセッションに置き換える

**Architecture:** ブラウザ初回ロード時に root layout の useEffect で `authClient.signIn.anonymous()` を呼び出して匿名 better-auth セッションを作成する。投票は `protectedProcedure` に変更し、`ctx.session.user.id` を `votes.userId` に保存する。localStorage の sessionId コードは全て削除する。

**Tech Stack:** better-auth 1.6.9 (anonymous plugin), Drizzle ORM (SQLite), tRPC, TanStack Router

---

## ファイル変更マップ

> **注意:** `votes` テーブルの定義は `packages/db/src/schema/idols.ts` にある（`schema/votes.ts` は `schema/index.ts` から export されていない未使用ファイル）。

| ファイル                                           | 変更種別 | 内容                                                   |
| -------------------------------------------------- | -------- | ------------------------------------------------------ |
| `packages/db/src/schema/auth.ts`                   | Modify   | `user` テーブルに `isAnonymous` カラム追加             |
| `packages/db/src/schema/idols.ts`                  | Modify   | `votes` テーブルの `sessionId` → `userId` (FK to user) |
| `packages/db/src/schema/votes.ts`                  | Delete   | 未使用ファイルを削除                                   |
| `packages/db/src/migrations/*.sql`                 | Generate | `drizzle-kit generate` で自動生成                      |
| `packages/auth/src/index.ts`                       | Modify   | `anonymous()` plugin を追加                            |
| `packages/api/src/routers/votes.ts`                | Modify   | `protectedProcedure` に変更、sessionId 削除            |
| `packages/api/src/routers/idols.ts`                | Modify   | battleQueue input から sessionId 削除                  |
| `packages/api/src/routers/__tests__/votes.test.ts` | Modify   | user 挿入 + mock session、sessionId 削除               |
| `apps/web/src/lib/auth-client.ts`                  | Modify   | `anonymousClient()` plugin 追加                        |
| `apps/web/src/lib/session.ts`                      | Delete   | localStorage sessionId コードを削除                    |
| `apps/web/src/routes/__root.tsx`                   | Modify   | 匿名サインイン useEffect 追加                          |
| `apps/web/src/routes/battle.tsx`                   | Modify   | sessionId 使用を削除                                   |

---

## Task 1: DB スキーマ更新

**Files:**

- Modify: `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/votes.ts`

- [ ] **Step 1: user テーブルに isAnonymous を追加**

`packages/db/src/schema/auth.ts` の `user` テーブルを以下のように変更する（`image` の次の行に追加）:

```ts
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

（`session`、`account`、`verification`、`userRelations`、`sessionRelations`、`accountRelations` は変更なし）

- [ ] **Step 2: votes テーブルの sessionId を userId (FK) に変更**

`packages/db/src/schema/idols.ts` の votes テーブル定義を変更する（`user` import を追加し `sessionId` → `userId`）:

```ts
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const idols = sqliteTable("idols", {
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  naviIdolId: text("navi_idol_id").unique(),
  name: text("name").notNull(),
  group: text("group").notNull(),
  eloRating: integer("elo_rating").notNull().default(1500),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const idolPhotos = sqliteTable(
  "idol_photos",
  {
    id: text("id")
      .$defaultFn(() => createId())
      .primaryKey(),
    idolId: text("idol_id")
      .notNull()
      .references(() => idols.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idol_photos_idolId_idx").on(table.idolId)],
);

export const votes = sqliteTable(
  "votes",
  {
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("votes_winnerId_idx").on(table.winnerId),
    index("votes_loserId_idx").on(table.loserId),
    index("votes_userId_idx").on(table.userId),
  ],
);

export const idolsRelations = relations(idols, ({ many }) => ({
  photos: many(idolPhotos),
  wonVotes: many(votes, { relationName: "winner" }),
  lostVotes: many(votes, { relationName: "loser" }),
}));

export const idolPhotosRelations = relations(idolPhotos, ({ one }) => ({
  idol: one(idols, {
    fields: [idolPhotos.idolId],
    references: [idols.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  winner: one(idols, {
    fields: [votes.winnerId],
    references: [idols.id],
    relationName: "winner",
  }),
  loser: one(idols, {
    fields: [votes.loserId],
    references: [idols.id],
    relationName: "loser",
  }),
  winnerPhoto: one(idolPhotos, {
    fields: [votes.winnerPhotoId],
    references: [idolPhotos.id],
  }),
  loserPhoto: one(idolPhotos, {
    fields: [votes.loserPhotoId],
    references: [idolPhotos.id],
  }),
  user: one(user, {
    fields: [votes.userId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 2b: 未使用の packages/db/src/schema/votes.ts を削除する**

```bash
git rm packages/db/src/schema/votes.ts
```

- [ ] **Step 3: commit**

```bash
git add packages/db/src/schema/auth.ts packages/db/src/schema/idols.ts packages/db/src/schema/votes.ts
git commit -m "feat(db): user.isAnonymous 追加・votes.session_id を user_id(FK) に変更"
```

---

## Task 2: マイグレーション生成

**Files:**

- Generate: `packages/db/src/migrations/`

- [ ] **Step 1: drizzle-kit generate を実行する**

```bash
cd packages/db && bun run db:generate
```

drizzle-kit が `session_id` カラムの扱い（rename or drop+add）を尋ねてくる場合がある。
`session_id` は `user_id` にリネームで回答する（既存データを捨てるため drop+add でも可）。

生成された `.sql` ファイルが `src/migrations/` に追加されることを確認する。

- [ ] **Step 2: 生成されたマイグレーションファイルを確認する**

`session_id` を削除し `user_id` を追加する SQL と、`is_anonymous` カラムを追加する SQL が含まれていることを確認する。

- [ ] **Step 3: commit**

```bash
git add packages/db/src/migrations/
git commit -m "feat(db): anonymous login 用マイグレーションを追加"
```

---

## Task 3: votes テストを更新（失敗するテストを先に書く）

**Files:**

- Modify: `packages/api/src/routers/__tests__/votes.test.ts`

- [ ] **Step 1: テストを以下の内容に書き換える**

```ts
import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols, votes } from "@oshi-idol/db/schema/idols";
import { user } from "@oshi-idol/db/schema/auth";
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

  test("session があれば投票を送信するとレーティングが更新され投票レコードが作成される", async () => {
    const [testUser] = await db
      .insert(user)
      .values({
        id: "test-user-id",
        name: "匿名ユーザー",
        email: "anon@test.com",
        emailVerified: false,
        isAnonymous: true,
      })
      .returning();

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

    const mockSession = {
      session: {
        id: "test-session-id",
        userId: testUser!.id,
        expiresAt: new Date(Date.now() + 86400000),
        token: "test-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: testUser!,
    };

    const caller = createCaller({ auth: null, session: mockSession, db });

    const result = await caller.submit({
      winnerId: winner!.id,
      loserId: loser!.id,
      winnerPhotoId: winnerPhoto!.id,
      loserPhotoId: loserPhoto!.id,
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

    const voteRecord = await db.query.votes.findFirst({
      where: eq(votes.userId, testUser!.id),
    });
    expect(voteRecord).toBeDefined();
    expect(voteRecord!.userId).toBe(testUser!.id);
  });

  test("session がない場合は UNAUTHORIZED エラーになる", async () => {
    const caller = createCaller({ auth: null, session: null, db });

    await expect(
      caller.submit({
        winnerId: "some-id",
        loserId: "other-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
      }),
    ).rejects.toThrow("Authentication required");
  });

  test("winner が見つからない場合は NOT_FOUND エラーになる", async () => {
    const [testUser] = await db
      .insert(user)
      .values({
        id: "test-user-id-2",
        name: "匿名ユーザー",
        email: "anon2@test.com",
        emailVerified: false,
        isAnonymous: true,
      })
      .returning();

    const mockSession = {
      session: {
        id: "test-session-id-2",
        userId: testUser!.id,
        expiresAt: new Date(Date.now() + 86400000),
        token: "test-token-2",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: testUser!,
    };

    const caller = createCaller({ auth: null, session: mockSession, db });

    await expect(
      caller.submit({
        winnerId: "nonexistent-id",
        loserId: "another-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
      }),
    ).rejects.toThrow("Winner not found");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
bun run test packages/api/src/routers/__tests__/votes.test.ts
```

Expected: FAIL（`submit` の input に `sessionId` がないため型エラー、または session: null で通過するため）

- [ ] **Step 3: commit**

```bash
git add packages/api/src/routers/__tests__/votes.test.ts
git commit -m "test(votes): anonymous session を使うテストに更新（まだ失敗）"
```

---

## Task 4: better-auth サーバー側に anonymous plugin を追加

**Files:**

- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: anonymous plugin を追加する**

```ts
import { createDb } from "@oshi-idol/db";
import * as schema from "@oshi-idol/db/schema/auth";
import { env } from "@oshi-idol/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [tanstackStartCookies(), anonymous()],
  });
}
```

- [ ] **Step 2: commit**

```bash
git add packages/auth/src/index.ts
git commit -m "feat(auth): better-auth に anonymous plugin を追加"
```

---

## Task 5: votes ルーターを protectedProcedure に変更

**Files:**

- Modify: `packages/api/src/routers/votes.ts`

- [ ] **Step 1: votes.ts を以下の内容に書き換える**

```ts
import { TRPCError } from "@trpc/server";
import { idols, votes } from "@oshi-idol/db/schema/idols";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { calculateBattleResult } from "../lib/elo";

export const votesRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        winnerId: z.string(),
        loserId: z.string(),
        winnerPhotoId: z.string(),
        loserPhotoId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { db, session } = ctx;

      const winner = await db.query.idols.findFirst({
        where: eq(idols.id, input.winnerId),
      });
      if (!winner) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Winner not found" });
      }

      const loser = await db.query.idols.findFirst({
        where: eq(idols.id, input.loserId),
      });
      if (!loser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Loser not found" });
      }

      const { newWinnerRating, newLoserRating } = calculateBattleResult(
        winner.eloRating,
        loser.eloRating,
      );

      // D1 は BEGIN をサポートしないため batch() で原子的に更新する
      await db.batch([
        db.insert(votes).values({
          winnerId: input.winnerId,
          loserId: input.loserId,
          winnerPhotoId: input.winnerPhotoId,
          loserPhotoId: input.loserPhotoId,
          userId: session.user.id,
        }),
        db
          .update(idols)
          .set({ eloRating: newWinnerRating, wins: winner.wins + 1 })
          .where(eq(idols.id, input.winnerId)),
        db
          .update(idols)
          .set({ eloRating: newLoserRating, losses: loser.losses + 1 })
          .where(eq(idols.id, input.loserId)),
      ]);

      return { success: true };
    }),
});
```

- [ ] **Step 2: votes テストが通ることを確認する**

```bash
bun run test packages/api/src/routers/__tests__/votes.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 3: commit**

```bash
git add packages/api/src/routers/votes.ts
git commit -m "feat(api): votes.submit を protectedProcedure に変更し userId を使用"
```

---

## Task 6: idols ルーターから sessionId を削除

**Files:**

- Modify: `packages/api/src/routers/idols.ts`

- [ ] **Step 1: battleQueue の input から sessionId を削除する**

`packages/api/src/routers/idols.ts` の `battleQueue` の input スキーマを以下のように変更する:

```ts
battleQueue: publicProcedure.input(
  z.object({
    excludeIdolIds: z.array(z.string()).optional(),
    count: z.number().min(1).max(20).default(20),
  }),
);
```

（`sessionId: z.string(),` の行を削除するだけ。ハンドラ本体は変更なし）

- [ ] **Step 2: 型チェックを実行する**

```bash
bun run check-types
```

Expected: エラーなし（まだ battle.tsx が sessionId を渡しているので型エラーが出る場合は後続 Task で解消）

- [ ] **Step 3: commit**

```bash
git add packages/api/src/routers/idols.ts
git commit -m "feat(api): battleQueue input から sessionId を削除"
```

---

## Task 7: auth-client に anonymousClient plugin を追加

**Files:**

- Modify: `apps/web/src/lib/auth-client.ts`

- [ ] **Step 1: auth-client.ts を書き換える**

```ts
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});
```

- [ ] **Step 2: commit**

```bash
git add apps/web/src/lib/auth-client.ts
git commit -m "feat(web): auth-client に anonymousClient plugin を追加"
```

---

## Task 8: root layout に匿名サインイン useEffect を追加

**Files:**

- Modify: `apps/web/src/routes/__root.tsx`

- [ ] **Step 1: \_\_root.tsx を書き換える**

```tsx
import type { AppRouter } from "@oshi-idol/api/routers/index";
import { Toaster } from "@oshi-idol/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import appCss from "../index.css?url";

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Oshi Battle" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bungee&family=JetBrains+Mono:wght@400;600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  const session = authClient.useSession();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      authClient.signIn.anonymous();
    }
  }, [session.isPending, session.data]);

  return (
    <html lang="ja" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="relative h-svh overflow-hidden bg-[#0a0418]">
        <Outlet />
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: commit**

```bash
git add apps/web/src/routes/__root.tsx
git commit -m "feat(web): root layout でブラウザ初回ロード時に匿名サインインを自動実行"
```

---

## Task 9: session.ts を削除し battle.tsx から sessionId 使用を除去

**Files:**

- Delete: `apps/web/src/lib/session.ts`
- Modify: `apps/web/src/routes/battle.tsx`

- [ ] **Step 1: session.ts を削除する**

```bash
git rm apps/web/src/lib/session.ts
```

- [ ] **Step 2: battle.tsx から sessionId 関連コードを削除する**

`apps/web/src/routes/battle.tsx` を以下のように変更する（差分のみ記載）:

**削除する行:**

```ts
import { getSessionId } from "@/lib/session";
```

```ts
const sessionId = getSessionId();
```

```ts
const battleQueue = useQuery(trpc.idols.battleQueue.queryOptions({ sessionId, count: QUEUE_SIZE }));
```

```ts
await submitVote.mutateAsync({
  winnerId: winner.id,
  loserId: loser.id,
  winnerPhotoId: winnerPhotoId ?? "",
  loserPhotoId: loserPhotoId ?? "",
  sessionId,
});
```

```ts
[phase, voting, voteCount, sessionId, submitVote, navigate],
```

**変更後の対応する行:**

```ts
// import { getSessionId } from "@/lib/session"; → 削除
```

```ts
// const sessionId = getSessionId(); → 削除
```

```ts
const battleQueue = useQuery(trpc.idols.battleQueue.queryOptions({ count: QUEUE_SIZE }));
```

```ts
await submitVote.mutateAsync({
  winnerId: winner.id,
  loserId: loser.id,
  winnerPhotoId: winnerPhotoId ?? "",
  loserPhotoId: loserPhotoId ?? "",
});
```

```ts
[phase, voting, voteCount, submitVote, navigate],
```

- [ ] **Step 3: 型チェックを実行する**

```bash
bun run check-types
```

Expected: エラーなし

- [ ] **Step 4: commit**

```bash
git add apps/web/src/routes/battle.tsx
git commit -m "feat(web): battle.tsx から sessionId を削除し better-auth セッションに移行"
```

---

## Task 10: 全体 verify

- [ ] **Step 1: lint + type check**

```bash
bun run check && bun run check-types
```

Expected: エラーなし

- [ ] **Step 2: テスト実行**

```bash
bun run test
```

Expected: 全テスト PASS

- [ ] **Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功

- [ ] **Step 4: dev server 起動確認**

```bash
(cd packages/infra && timeout 30 bun run dev 2>&1 || true) | grep -vE "SIGTERM|Polite quit"
```

Expected: `error:` / `AssertionError` / `command not found` が含まれないこと

- [ ] **Step 5: PR 作成**

```bash
git push -u origin add-anonymous-user-id
gh pr create --title "feat: better-auth anonymous plugin で匿名ユーザーセッションを実装" --body "$(cat <<'EOF'
## Summary
- better-auth の anonymous plugin を追加し、ブラウザ初回ロード時に匿名ユーザーを自動作成
- `votes.session_id`（localStorage ベース）を `votes.user_id`（better-auth セッション FK）に変更
- localStorage の sessionId コードを全て削除

## Test plan
- [ ] `bun run test` がグリーンであること
- [ ] ブラウザで / にアクセスし、DevTools の Application > Cookies に better-auth セッション Cookie が作成されること
- [ ] /battle で投票が正常に送信されること

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
