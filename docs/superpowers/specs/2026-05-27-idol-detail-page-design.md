# アイドル詳細ページ 設計仕様

## 概要

ランキングページ・履歴ページの各アイドルをクリックすると、そのアイドルの詳細情報ページへ遷移できるようにする。

## ルーティング

- 新ルート: `/idol/$idolId`
- TanStack Router のファイルベースルーティングで実装
- ファイル: `apps/web/src/routes/idol/$idolId/index.tsx`
- バックボタンは `navigate({ to: -1 })` または `window.history.back()` で元ページに戻る

## APIレイヤー

`packages/api/src/routers/idols.ts` に `byId` プロシージャを追加する。

```
入力: { id: string }
出力: {
  id, name, group,
  eloRating, wins, losses, winRate,
  photos: [{ id, imageUrl, sortOrder }]
}
```

- id が存在しない場合は `TRPCError({ code: "NOT_FOUND" })` を返す
- winRate は `wins / (wins + losses)`（total=0 のとき 0）

## UIレイアウト（ヒーローバナー型）

既存のランキングページヘッダーと同じデザイン言語で統一する。

```
┌─────────────────────────────┐
│ ← BACK                      │  ← ヘッダー
├─────────────────────────────┤
│                             │
│   [写真: フル幅ヒーロー]     │  ← 高さ ~280px
│   グラデーションオーバーレイ  │
│   SAKURA                    │  ← 写真上にオーバーレイ
│   LE SSERAFIM               │
├─────────────────────────────┤
│  1620 ELO        [S TIER]   │  ← ELO + ティアバッジ
├─────────────────────────────┤
│  127    │  23   │  85%      │  ← 3列グリッド
│  WINS   │ LOSS  │ WIN RATE  │
└─────────────────────────────┘
```

- ティアは既存の `getTier(eloRating)` ユーティリティを再利用
- 写真なしの場合はグラデーション背景 + ♪ アイコン

## ナビゲーション追加箇所

| ファイル                                     | 変更内容                                           |
| -------------------------------------------- | -------------------------------------------------- |
| `routes/ranking/_components/rank-row.tsx`    | `div` 全体を `Link` またはクリックハンドラでラップ |
| `routes/ranking/_components/tier-row.tsx`    | 各アイドルのサムネイルを `Link` でラップ           |
| `routes/history/_components/history-row.tsx` | 勝者名・敗者名それぞれに `Link` を追加             |

## テスト方針

- `idols.byId` のユニットテスト（正常系・NOT_FOUND）を `packages/api/src/routers/__tests__/idols.test.ts` に追加
- フロントのルートテストは既存の `routes/-__tests__/` パターンに倣い追加

## 影響範囲

- `packages/api`: `idols.ts` に1プロシージャ追加のみ
- `apps/web`: 新ルート1ファイル + 既存3コンポーネントに `Link` 追加
- DBスキーマ変更なし・マイグレーション不要
