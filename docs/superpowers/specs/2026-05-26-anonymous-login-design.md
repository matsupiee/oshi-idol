# Anonymous Login 設計ドキュメント

**日付**: 2026-05-26  
**ブランチ**: add-anonymous-user-id  
**ステータス**: 承認済み

---

## 背景・目的

現在、投票（votes）の匿名ユーザー追跡は localStorage の `sessionId` で実装されている。  
これをブラウザストレージに依存しない better-auth の anonymous plugin に置き換え、  
サーバーサイドで安定したユーザー追跡を実現する。

将来的な実名アカウントへの昇格（account linking）にも対応できる基盤を整える。

---

## 採用アプローチ

**better-auth anonymous plugin + root layout effect**

- `anonymous` plugin を better-auth に追加
- ルートレイアウトで `authClient.signIn.anonymous()` を自動呼び出し（初回ロード時）
- `votes.session_id` → `votes.user_id`（user テーブルへの FK）
- localStorage の sessionId コードを削除

---

## アーキテクチャ

```
ブラウザ初回ロード
  └─ root layout (useEffect)
       └─ session なし？ → authClient.signIn.anonymous()
            └─ better-auth が user(isAnonymous=true) + session を作成
                 └─ Cookie でセッション保持
                      └─ 投票時: TRPC context から session.user.id を取得
                           └─ votes.user_id に保存
```

---

## DB スキーマ変更

### user テーブル（packages/db/src/schema/auth.ts）

```ts
// 追加
isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false);
```

better-auth の anonymous plugin が要求するカラム。

### votes テーブル（packages/db/src/schema/votes.ts）

```ts
// 変更前
sessionId: text("session_id").notNull();

// 変更後
userId: text("user_id")
  .notNull()
  .references(() => user.id);
```

---

## 変更ファイル一覧

| ファイル                                | 変更内容                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `packages/auth/src/index.ts`            | `anonymous()` plugin を追加                                             |
| `packages/db/src/schema/auth.ts`        | `user` テーブルに `isAnonymous` カラム追加                              |
| `packages/db/src/schema/votes.ts`       | `session_id` → `user_id`（FK to user）                                  |
| `apps/web/src/lib/auth-client.ts`       | `anonymousClient()` plugin を追加                                       |
| `apps/web/src/lib/session.ts`           | localStorage sessionId 関連コードを削除                                 |
| `apps/web/src/routes/__root.tsx`        | 匿名サインイン自動実行の useEffect 追加                                 |
| `apps/web/src/routes/battle.tsx`        | sessionId 渡しを session.user.id に変更                                 |
| `packages/api/src/trpc/routes/votes.ts` | session から userId を取得するよう変更                                  |
| `packages/api/src/context.ts`           | （確認）session がすでに context に含まれているため変更不要の可能性あり |

---

## エラーハンドリング

- `signIn.anonymous()` が失敗しても UI はクラッシュしない（投票ボタンは非活性化）
- TRPC の投票プロシージャは `protectedProcedure` に変更し、session を必須とする
- セッションがない状態で投票しようとした場合は `UNAUTHORIZED` エラー

---

## マイグレーション方針

- 既存の votes データ（localStorage ベースの session_id）は破棄
  - MVP 段階であり、本番データの完全な移行は対象外
- `drizzle-kit generate` でマイグレーションファイルを生成する

---

## テスト方針

- 初回ロード時に better-auth セッションが作成されること
- 投票が `user_id` で正しく記録されること
- セッションなし状態での投票が `UNAUTHORIZED` を返すこと
- 既存のbetter-auth スキーマと互換性があること（統合テスト）

---

## 対象外（スコープ外）

- 匿名ユーザーから実名アカウントへのアカウント昇格（account linking）
- 既存 votes データのマイグレーション
