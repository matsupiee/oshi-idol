# スクレイパー + R2保存 設計書

**日付**: 2026-05-19  
**対象**: navi-idol.com からアイドル情報をスクレイピングし、Cloudflare R2 に保存後 D1 に投入する仕組み

---

## 概要

navi-idol.com の全アイドル情報（名前・グループ・画像）を取得し、Cloudflare R2 に保存する。
その後、別スクリプトで R2 のデータを D1（idols / idol_photos テーブル）に投入する。

---

## ファイル構成

```
packages/scraper/
├── src/
│   ├── scrape/
│   │   ├── main.ts             # スクレイピングエントリーポイント
│   │   ├── browser.ts          # Playwright ブラウザ管理
│   │   └── parsers/
│   │       ├── idol-list.ts    # 一覧ページのパース
│   │       └── idol-detail.ts  # 個別ページのパース
│   ├── import-to-db/
│   │   └── main.ts             # R2 → D1 インポート
│   └── r2.ts                   # R2 ユーティリティ（scrape/import 両方から使用）
├── package.json
└── tsconfig.json
```

---

## 依存ライブラリ

| ライブラリ           | 用途                                       |
| -------------------- | ------------------------------------------ |
| `playwright`         | JSチャレンジ突破のためのヘッドレスブラウザ |
| `@aws-sdk/client-s3` | R2（S3互換）へのアップロード               |
| `dotenv`             | 環境変数読み込み                           |

**Cheerio を使わない理由**: navi-idol.com は Vercel Security Checkpoint（JSチャレンジ）を実装しており、単純な HTTP fetch では通過できないため。

---

## データフロー

### scrape/main.ts（スクレイピング → R2）

```
1. Playwright でブラウザ起動
2. 一覧ページを巡回 → idol-list.ts でアイドルURL一覧を取得
3. 各アイドルページを開く → idol-detail.ts でパース
   → { name, group, sourceUrl, images[] }
4. profile.json を R2 に保存
5. 各画像を fetch → R2 に保存
6. ブラウザを閉じる
```

### import-to-db/main.ts（R2 → D1）

```
1. R2 の */profile.json を全件リスト
2. 各 profile.json を読み込む
3. idols テーブルに upsert（name + group でユニーク判定）
4. idol_photos テーブルに upsert（R2 公開URL を imageUrl として保存）
```

---

## R2 保存構造

1バケット（`oshi-idol-assets`）にすべて保存する。

```
idols/{group-slug}/{idol-slug}/profile.json
idols/{group-slug}/{idol-slug}/images/0.jpg
idols/{group-slug}/{idol-slug}/images/1.jpg
...
```

### profile.json フォーマット

```json
{
  "name": "Sakura",
  "group": "LE SSERAFIM",
  "sourceUrl": "https://navi-idol.com/...",
  "scrapedAt": "2026-05-19T00:00:00Z",
  "images": [
    {
      "key": "idols/le-sserafim/sakura/images/0.jpg",
      "originalUrl": "https://..."
    }
  ]
}
```

### DB への imageUrl

`https://{R2_PUBLIC_URL}/idols/{group-slug}/{idol-slug}/images/{n}.jpg`

---

## 環境変数

`packages/scraper/.env`（またはルートの `.env`）に追加：

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=oshi-idol-assets
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## エラーハンドリング

- 個別アイドルのスクレイピング失敗は **スキップして続行**（1件失敗で全体を止めない）
- 失敗した URL はコンソールに `warn` 出力
- レートリミット対策: 各リクエスト間に 1〜2 秒のディレイ

---

## テスト方針

- `scrape/main.ts` は E2E 的な性質のため自動テスト対象外
- `parsers/idol-list.ts` と `parsers/idol-detail.ts` は HTML フィクスチャを使ったユニットテストを書く
- `import-to-db/main.ts` は既存の DB テストパターンに倣ってインテグレーションテスト

---

## 実行方法（完成後）

```bash
# スクレイピング → R2 保存
pnpm --filter @oshi-idol/scraper scrape

# R2 → D1 インポート
pnpm --filter @oshi-idol/scraper import-to-db
```
