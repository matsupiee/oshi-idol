# 設計仕様: vote実行時のIPアドレス収集

**日付**: 2026-05-26  
**目的**: アクセス解析・地域分析のため、vote実行時のクライアントIPアドレスをDBに収集する

---

## 背景・目的

現在の `votes` テーブルには投票者の IPアドレスが記録されていない。
アクセス解析や地域分析（どの地域からどのアイドルが支持されているか等）を可能にするため、投票時のIPアドレスを収集・保存する。

---

## 設計方針

- **保存形式**: 生のIPアドレス（文字列）をそのまま保存
- **取得元**: Cloudflare Workers 環境のため `CF-Connecting-IP` ヘッダーを優先し、`X-Forwarded-For` にフォールバック
- **nullable**: IPが取得できないケース（ローカル開発、テスト環境など）を考慮して nullable とする
- **保存場所**: 既存の `votes` テーブルに `ip_address` カラムを追加（別テーブルは不要）

---

## 変更ファイル一覧

| ファイル                                           | 変更内容                                            |
| -------------------------------------------------- | --------------------------------------------------- |
| `packages/db/src/schema/votes.ts`                  | `ipAddress` カラム追加                              |
| `packages/api/src/context.ts`                      | IPアドレスをコンテキストに追加                      |
| `packages/api/src/routers/votes.ts`                | insert 時に `ctx.ipAddress` を渡す                  |
| `packages/api/src/routers/__tests__/votes.test.ts` | context に `ipAddress` 追加、IP保存の検証ケース追加 |
| `packages/db/src/migrations/*.sql`                 | `drizzle-kit generate` で自動生成                   |

---

## 詳細設計

### 1. DBスキーマ変更

`packages/db/src/schema/votes.ts` に `ipAddress` カラムを追加:

```ts
ipAddress: text("ip_address"),  // nullable
```

### 2. Context変更

`packages/api/src/context.ts` で `CF-Connecting-IP` → `X-Forwarded-For` の順にIPを取得:

```ts
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
```

### 3. Router変更

`packages/api/src/routers/votes.ts` の `insert` に `ipAddress` を追加:

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

### 4. テスト変更

- `createCaller({ auth: null, session: null, db, ipAddress: null })` に `ipAddress` を追加
- IPアドレスが保存されることを検証するテストケースを追加:

```ts
test("投票を送信するとIPアドレスが記録される", async () => {
  // ...セットアップ...
  const caller = createCaller({ auth: null, session: null, db, ipAddress: "203.0.113.1" });
  await caller.submit({ ... });
  // votes テーブルから該当レコードを取得して ip_address を検証
});
```

---

## 考慮事項

- **プライバシー**: IPアドレスは個人情報に該当しうる。現時点では生データを保存するが、将来的な匿名化・削除ポリシーの整備を推奨する
- **テスト環境**: ローカル開発・単体テストでは `ipAddress: null` を渡す
- **IPv4/IPv6**: text型で保存するためどちらも対応可能
