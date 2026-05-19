# Arcade UI Redesign — Oshi Battle

_Approved: 2026-05-20_

## 概要

Claude Design で作成したアーケード/ネオン格闘ゲーム風プロトタイプ（`h/p0_kpFLWZWawFTikoXKirg`）を既存の TanStack Start + tRPC + Tailwind v4 スタックに移植する。未使用の画面・コンポーネントは同時に削除する。

## スコープ

### 変更対象

| ファイル                             | 変更内容                                                             |
| ------------------------------------ | -------------------------------------------------------------------- |
| `apps/web/src/routes/__root.tsx`     | Header 削除、フルスクリーンレイアウト                                |
| `apps/web/src/routes/index.tsx`      | Home 画面をアーケード風に全面リデザイン                              |
| `apps/web/src/routes/battle.tsx`     | Battle 画面を斜め分割＋FX バースト付きに全面リデザイン               |
| `apps/web/src/routes/ranking.tsx`    | Ranking 画面をスクロール式（TOP10→Tier→Stats→Share）に全面リデザイン |
| `apps/web/src/index.css`             | Google Fonts 追加、FX アニメーション keyframes 追加                  |
| `apps/web/src/components/header.tsx` | 削除（未使用に）                                                     |
| `apps/web/src/routes/dashboard.tsx`  | 削除                                                                 |
| `apps/web/src/routes/admin.tsx`      | 削除                                                                 |
| `apps/web/src/routes/login.tsx`      | 削除                                                                 |

### 変更しない対象

- tRPC ルーター・API ロジック（データフェッチはそのまま）
- DB スキーマ、パッケージ構成
- shadcn コンポーネント（Button などは引き続き使用可）

## ビジュアルシステム

### カラーパレット（HOT テーマ固定）

```
background: #0a0418
accent:     #ff2e88  (ホットピンク)
primary:    #9d4dff  (バイオレット)
secondary:  #fff200  (イエロー)
```

### フォント

- **Bungee** — 見出し・スコア・VS テキスト（Google Fonts CDN）
- **JetBrains Mono** — HUD チップ・ラベル・タグ（Google Fonts CDN）
- **Noto Sans JP** — 日本語本文（Google Fonts CDN）

### エフェクト

- CRT スキャンライン: `repeating-linear-gradient` で疑似CRTオーバーレイ
- ネオングロー: `text-shadow` / `box-shadow` に accent/primary を多重適用
- FX バースト: CSS `@keyframes` でパーティクル（ハート）を放射状に飛ばす

## 画面仕様

### Home

- 背景: perspective グリッド床 + ネオン太陽
- タイトル: "OSHI BATTLE"（Bungee, 大型, 多色 text-shadow）
- CTA: "▶ PRESS START"（グラデーションボタン、押し込みアニメーション）
- データなし（静的画面）

### Battle

- レイアウト: `clip-path: polygon` による斜め2分割（上=アイドルA、下=アイドルB）
- 写真あり: `<img>` を `object-cover` で表示 / なし: グラデーション + ♪
- VS オーバーレイ: 斜め稲妻ライン + "VS" テキスト（clash スタイル）
- タップ FX: ハートパーティクルが放射状に飛ぶ（CSS keyframes, ~900ms）
- 敗者パネル: `filter: saturate(0.2) brightness(0.4)` でフェードアウト
- HUD 上部: `ROUND XX/10` チップ + プログレスバー
- HUD 下部: "TAP TO VOTE · 推しを選べ" ラベル
- データ: `trpc.idols.battlePair` + `trpc.votes.submit`（既存ロジック保持）

### Ranking

- スクロールビュー（`overflow-y: auto`、スクロールバー非表示）
- セクション 01: TOP10 — ランク番号 + サムネイル + 名前 + ELO + "YOUR PICK" バッジ
- セクション 02: Tier List — S/A/B/C/D 行、左ラベルブロック + アイコングリッド
- セクション 03: Stats — 2×2 グリッド（TOP GROUP / TOTAL VOTES / OSHI TYPE / WIN RATE）
- セクション 04: Share Card — 縦長ポスター（3:1 grid for TOP3 + 4列 grid for 4-10）
- CTAs: SHARE ボタン（グラデーション）+ PLAY AGAIN ボタン（アウトライン）
- データ: `trpc.ranking.top10`（既存ロジック保持）

## 削除対象

- `apps/web/src/routes/dashboard.tsx` — 未使用
- `apps/web/src/routes/admin.tsx` — スコープ外（CSV アップロード機能は別 PR）
- `apps/web/src/routes/login.tsx` — 未使用（匿名セッション方式のため不要）
- `apps/web/src/components/header.tsx` — root から削除後に不要

## 受け入れ条件

- `pnpm check`, `pnpm check-types`, `pnpm build` がグリーン
- Home / Battle / Ranking の3画面がアーケード風デザインで動作する
- 実写アイドル写真あり・なし両方でレイアウトが崩れない
