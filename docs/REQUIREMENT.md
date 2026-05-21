# Idol Battle App MVP

## コンセプト

2人のアイドル画像を表示し、ユーザーが好きな方を選び続けるアプリ。
選択データからランキングを生成する。

---

# MVP要件

## 1. バトル画面

### 必須

- 2人のアイドル画像表示
- 名前表示
- タップで投票
- 投票後すぐ次の2人表示
- 10人選んだら終わり

### UI

- スマホファースト
- 上下2分割UI
- フルスクリーン画像
- VS表示

### UX

- ローディング最小化
- 0.1秒レベルで次表示
- 選択時軽いアニメーション

---

## 2. ランキング生成

### ロジック

- ELO Rating採用

### 表示

- TOP10
- Tier List
- 勝率
- 推しタイプ分析（後で追加可能）

---

## 3. セッション保存

### MVP

- localStorage
- 匿名ユーザー
- ログイン不要

保存内容：

- vote history
- current ranking
- total votes

---

## 4. アイドルデータ

### 最低構成

```json
{
  "id": "1",
  "name": "Sakura",
  "group": "LE SSERAFIM",
  "imageUrl": "..."
}
```

---

# KPI

## 最重要

- 1セッション平均投票数

## その他

- 翌日継続率
- シェア率
- 平均滞在時間

---

# 画面一覧

## 1. Home

- Start button

## 2. Battle Screen

- 2択UI
- vote counter
- progress bar

## 3. Ranking Screen

- 全体ランキング TOP10
- Tier list
- share button

---

# 将来の拡張

- AI推し分析
- 顔タイプ分類
- グループ別ランキング
- 地域別ランキング
- 推し診断
- Tinder風スワイプ
- AIおすすめ推し

- ストリーク
- 世界ランキング
- 急上昇表示
- 今日の推し
- フレンド対戦

- コメント
- フォロー
- DM
- 動画
- 通知
- 管理画面
- 課金
