# デザイン仕様: 対戦画面アイドル顔可視性の修正

**日付:** 2026-05-22  
**対象ファイル:** `apps/web/src/routes/battle.tsx`

## 問題

現在の `BattlePanel` コンポーネントは両パネルとも `absolute inset-0`（全画面）で配置し、`clip-path` で表示領域を切り取る実装になっている。

- 上パネル clip: `polygon(0 0, 100% 0, 100% 38%, 0 62%)`
- 下パネル clip: `polygon(0 62%, 100% 38%, 100% 100%, 0 100%)`

この設計では下パネルの `img` が全画面サイズの `object-cover` として中央寄りに表示されるため、アイドル写真の顔（多くは写真上部）が clip-path 境界より上にあり見えなくなる。

## 採用するアプローチ: 独立パネル構造

各パネルに独立した表示コンテナを割り当て、clip-path を装飾的な対角線境界の演出にのみ使う。

## 設計詳細

### パネルコンテナの配置

| パネル   | 現在               | 変更後                                     |
| -------- | ------------------ | ------------------------------------------ |
| 上パネル | `absolute inset-0` | `absolute top-0 left-0 right-0 h-[60%]`    |
| 下パネル | `absolute inset-0` | `absolute bottom-0 left-0 right-0 h-[60%]` |

上下それぞれが画面の60%を占め、中央20%が重複ゾーンとなる。この重複ゾーンで対角線境界を形成する。

### clip-path の調整

各パネルのコンテナ内の相対 % で計算する。

**上パネル（コンテナ高さ = 画面の60%）:**

```
polygon(0 0, 100% 0, 100% 63%, 0 100%)
```

- 左辺: コンテナ底面 100% = 画面60% 位置
- 右辺: コンテナ63% = 画面37.8% ≈ 画面38% 位置
- → 対角線は画面上で右38%・左60% を結ぶ（現行とほぼ同じ視覚効果）

**下パネル（コンテナ高さ = 画面の60%、bottom: 0 配置）:**

```
polygon(0 37%, 100% 0, 100% 100%, 0 100%)
```

- 右辺: コンテナ頂面 0% = 画面40% 位置
- 左辺: コンテナ37% = 画面40% + 37%×60% = 画面62% 位置
- → 対角線は画面上で右40%・左62% を結ぶ（現行とほぼ同じ視覚効果）

### 画像の表示位置

```tsx
<img
  src={idol.photo.imageUrl}
  alt={idol.name}
  className="h-full w-full object-cover"
  style={{ objectPosition: "center 25%" }}
/>
```

両パネルとも `object-position: center 25%` を適用し、写真の上部25%付近（顔が来やすい位置）をコンテナ上端に合わせる。

### ネームプレートの位置調整

コンテナが小さくなるため絶対位置を調整する。

| ネームプレート | 現在         | 変更後       |
| -------------- | ------------ | ------------ |
| 上パネル       | `top: 110`   | `top: 90`    |
| 下パネル       | `bottom: 90` | `bottom: 60` |

### BattlePanelProps の型変更

`clip` prop は不要になる（clip-path は position に基づいて内部で決定する）。

```tsx
// 変更前
interface BattlePanelProps {
  idol: IdolData;
  clip: string;  // ← 削除
  position: "top" | "bottom";
  ...
}

// 変更後
interface BattlePanelProps {
  idol: IdolData;
  position: "top" | "bottom";
  ...
}
```

呼び出し元の `clipA`/`clipB` 変数および `clip={clipA}` の prop 渡しも削除する。

### transformOrigin

win/lose アニメーションの変形起点は変更なし。

```tsx
transformOrigin: position === "top" ? "50% 30%" : "50% 70%";
```

## 変更しないもの

- VS バッジ・対角線ライン（`z-index: 4/6`）はそのまま維持
- HeartBurst、HUD、スキャンラインは変更なし
- win/lose アニメーション（`animate-panel-win` / `animate-panel-lose`）は変更なし
- ネームプレートの色・フォント・グループ名表示は変更なし
- 暗いフェードグラデーション・インナーグローは変更なし

## 検証方法

- `bun run check` / `bun run check-types` / `bun run test` / `bun run build` がグリーン
- `bun run dev` で起動し、実際の対戦画面で上下両アイドルの顔が見えることを目視確認
