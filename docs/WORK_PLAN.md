# Idol Battle App MVP — 作業計画書

## 概要

`REQUIREMENT.md` に基づくMVP実装の作業計画。
フェーズ単位で進め、各フェーズで `pnpm check` + `pnpm test` をグリーンにしてからマージする。

**技術スタック**

| レイヤー       | 採用技術                                    |
| -------------- | ------------------------------------------- |
| フロントエンド | TanStack Start + TanStack Router + React 19 |
| APIレイヤー    | tRPC（Cloudflare Workers）                  |
| DB             | Drizzle ORM + Cloudflare D1（SQLite）       |
| 認証           | better-auth                                 |
| UI             | shadcn/ui + Tailwind CSS v4                 |
| インフラ       | Cloudflare（Workers + D1 + R2）             |

---

## フェーズ構成

```
Phase 1: データ基盤
Phase 2: バトルコア（ロジック）
Phase 3: フロントエンド（画面実装）
Phase 4: アイドル管理（Admin）
Phase 5: シェア機能
```

---

## Phase 1: データ基盤

**目標**: DBスキーマとseedデータを整備し、アイドルデータを扱える状態にする。

### タスク

| #   | タスク                      | 詳細                                                                      |
| --- | --------------------------- | ------------------------------------------------------------------------- |
| 1-1 | idols テーブル作成          | `id`, `name`, `group`, `imageUrl`, `eloRating`（初期値1500）, `createdAt` |
| 1-2 | votes テーブル作成          | `id`, `winnerId`, `loserId`, `sessionId`, `createdAt`                     |
| 1-3 | Drizzleマイグレーション実行 | `drizzle-kit generate` → `drizzle-kit migrate`                            |
| 1-4 | seedデータ作成              | LE SSERAFIM / aespa / NewJeans等 10〜20名のサンプルデータ                 |

### スキーマ詳細

```typescript
// idols
idols = {
  id: text (PK, nanoid),
  name: text (NOT NULL),
  group: text (NOT NULL),
  eloRating: integer (DEFAULT 1500),
  wins: integer (DEFAULT 0),
  losses: integer (DEFAULT 0),
  createdAt: integer (timestamp),
}

// idol_photos（1アイドル = 複数写真）
idol_photos = {
  id: text (PK, nanoid),
  idolId: text (FK -> idols.id, ON DELETE CASCADE),
  imageUrl: text (NOT NULL),
  sortOrder: integer (DEFAULT 0),  // 表示順。0が先頭（メイン写真）
  createdAt: integer (timestamp),
}

// votes
votes = {
  id: text (PK, nanoid),
  winnerId: text (FK -> idols.id),
  loserId: text (FK -> idols.id),
  winnerPhotoId: text (FK -> idol_photos.id),  // バトルで表示した写真を記録
  loserPhotoId: text (FK -> idol_photos.id),
  sessionId: text (NOT NULL),   // localStorage の匿名ID
  createdAt: integer (timestamp),
}
```

**バトルでの写真選択**: 対戦ペアを返す `battlePair` APIでは、各アイドルの写真からランダム1枚を選んで返す。これにより同じアイドルでも毎回異なる写真が表示される。

---

## Phase 2: バトルコア（ロジック）

**目標**: 投票・ELO計算・ランキング取得のAPIを実装する。

### タスク

| #   | タスク                       | 詳細                                                            |
| --- | ---------------------------- | --------------------------------------------------------------- |
| 2-1 | ELO Rating ロジック実装      | `packages/api/src/lib/elo.ts` に純粋関数として実装。K=32        |
| 2-2 | `idols.list` API             | 全アイドル一覧取得（ランキング順）                              |
| 2-3 | `idols.battlePair` API       | ランダムな2人を返す（同じセッション内で直近対戦済みは除外）     |
| 2-4 | `votes.submit` API           | 投票を記録し、両者のELO Ratingを更新                            |
| 2-5 | `ranking.top10` API          | ELO順TOP10を返す                                                |
| 2-6 | sessionId 管理ユーティリティ | `apps/web/src/lib/session.ts`：localStorageで匿名IDを生成・保持 |

### ELO計算式

```
K = 32
expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
newRating = currentRating + K * (actual - expected)
// actual: 勝ち=1, 負け=0
```

### API設計（tRPC）

```typescript
appRouter = {
  idols: {
    list: publicProcedure, // GET /api/trpc/idols.list
    battlePair: publicProcedure, // GET /api/trpc/idols.battlePair
  },
  votes: {
    submit: publicProcedure, // POST /api/trpc/votes.submit
    // input: { winnerId, loserId, sessionId }
  },
  ranking: {
    top10: publicProcedure, // GET /api/trpc/ranking.top10
  },
};
```

---

## Phase 3: フロントエンド（画面実装）

**目標**: Home・Battle・Ranking の3画面を実装し、MVPの体験を完成させる。

### タスク

| #   | タスク                 | 詳細                                                        |
| --- | ---------------------- | ----------------------------------------------------------- |
| 3-1 | Home画面 `/`           | Startボタン → `/battle` へ遷移。既存の ASCII アートは削除   |
| 3-2 | Battle画面 `/battle`   | 上下2分割、フルスクリーン画像、VS表示、名前、プログレスバー |
| 3-3 | 投票インタラクション   | タップで選択 → アニメーション → 次のペアへ（0.1秒レベル）   |
| 3-4 | 10票完了後の遷移       | `/ranking` へ自動遷移                                       |
| 3-5 | Ranking画面 `/ranking` | TOP10リスト、順位・名前・ELO・勝率を表示                    |
| 3-6 | Tier List表示          | S/A/B/C/D のTier別グルーピング（ELO基準で区切り）           |
| 3-7 | 再バトルボタン         | Ranking画面から `/battle` へ戻る                            |

### ルート構成

```
/           → Home（Startボタン）
/battle     → Battle画面（10票バトル）
/ranking    → Ranking画面（TOP10 + Tier List）
/admin      → Admin画面（Phase 4）
```

### Battle画面 UI仕様

```
┌─────────────────────┐
│                     │
│   アイドルA 画像    │  ← タップで投票
│   [名前 / グループ] │
│                     │
├──────── VS ─────────┤
│                     │
│   アイドルB 画像    │  ← タップで投票
│   [名前 / グループ] │
│                     │
└─────────────────────┘
  [=======-----] 7/10
```

**パフォーマンス要件**:

- 次のペアは事前prefetch（TanStack Query の `prefetchQuery`）
- 画像は `loading="eager"` + `fetchpriority="high"` で先読み

---

## Phase 4: アイドル管理（Admin）

**目標**: 管理者がアイドルデータを登録・管理できるAdmin画面を実装する。

### タスク

| #   | タスク                        | 詳細                                                                   |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 4-1 | Admin画面 `/admin` の認証保護 | better-auth のセッションで保護。`admin` ロールのユーザーのみアクセス可 |
| 4-2 | アイドル一覧表示              | 登録済みアイドルの一覧テーブル                                         |
| 4-3 | GUIからの1件登録フォーム      | 名前・グループ・画像URLを入力して登録                                  |
| 4-4 | CSVアップロード               | `name,group,imageUrl` の形式でバルク登録                               |
| 4-5 | アイドル削除                  | 登録済みアイドルの削除（投票データも連動削除）                         |

### CSVフォーマット

写真は複数行で同じ `name` + `group` を繰り返すことで登録できる。

```csv
name,group,imageUrl
Sakura,LE SSERAFIM,https://...photo1.jpg
Sakura,LE SSERAFIM,https://...photo2.jpg
Chaewon,LE SSERAFIM,https://...photo1.jpg
```

同じ `name` + `group` の行は同一アイドルとして `idol_photos` にまとめて登録される。

---

## Phase 5: シェア機能

**目標**: ランキング結果をSNSでシェアできるようにしてバズを狙う。

### タスク

| #   | タスク           | 詳細                                                     |
| --- | ---------------- | -------------------------------------------------------- |
| 5-1 | TOP10画像生成    | `html-to-image` または Canvas API でランキング画像を生成 |
| 5-2 | X（Twitter）共有 | Web Intent URLで投稿テキスト + 画像                      |
| 5-3 | 画像ダウンロード | `<a download>` でローカル保存                            |

---

## 実装順序と依存関係

```
Phase 1 (DB) → Phase 2 (API) → Phase 3 (Frontend)
                                      ↓
                             Phase 4 (Admin) ← 並行可
                                      ↓
                             Phase 5 (Share)
```

Phase 3 完了時点でMVPとして動作する最小構成が完成する。
Phase 4・5 はその後に追加する。

---

## 品質基準（各フェーズ完了条件）

- `pnpm check`（型チェック + lint）がグリーン
- `pnpm test` がグリーン
- ドキュメント更新（アーキテクチャ変更を伴う場合は本ファイルも更新）

---

## 未決事項（実装前に決定が必要なもの）

| 項目                     | 現状                          | 決定が必要なタイミング |
| ------------------------ | ----------------------------- | ---------------------- |
| 画像ホスティング         | 未定（imageUrlは外部URL想定） | Phase 1 開始前         |
| Adminロールの付与方法    | better-auth の仕組みを確認    | Phase 4 開始前         |
| Tier List の ELO区切り値 | 未定                          | Phase 3 Step 3-6 前    |
| 対戦ペア選択アルゴリズム | ランダム（直近除外）で十分か  | Phase 2 開始前         |
