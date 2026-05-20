# スクレイパー

`packages/scraper` パッケージが担うスクレイピング〜DB取り込みの手順をまとめる。

---

## 概要

2段階のパイプライン構成：

1. **scrape**: [navi-idol.com](https://navi-idol.com) からアイドル情報を取得し、Cloudflare R2 に保存
2. **import-to-db**: R2 に保存したデータを Cloudflare D1 に取り込む

---

## 環境変数

`packages/scraper/.env` に以下を設定する。

```env
# Cloudflare R2（スクレイピング結果の保存先）
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=          # R2 バケットのパブリック URL（例: https://pub-xxx.r2.dev）

# Cloudflare D1（import-to-db で使用）
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=    # D1 への書き込み権限を持つ API トークン
```

R2 のアクセスキーは Cloudflare ダッシュボード → **R2 → Manage R2 API Tokens** から作成する。  
D1 トークンは **My Profile → API Tokens** で `D1: Edit` 権限を付与して作成する。

---

## Step 1: スクレイピング（scrape）

```bash
cd packages/scraper
bun run scrape
```

### 処理の流れ

1. Playwright (Chromium / headless) で `/idol?page=0` から全ページのアイドルURL一覧を収集
2. 各アイドル詳細ページから名前・グループ・画像URLをパース
3. 画像を R2 へアップロード（`idols/<naviIdolId>/images/<n>.<ext>`）
4. プロフィールを JSON で R2 へ保存（`idols/<naviIdolId>/profile.json`）

### R2 に保存されるファイル構造

```
idols/
└── <naviIdolId>/
    ├── profile.json
    └── images/
        ├── 0.jpg
        └── 1.webp
```

`profile.json` のスキーマ：

```jsonc
{
  "naviIdolId": "...",
  "name": "...",
  "group": "...",
  "sourceUrl": "https://navi-idol.com/idol/...",
  "scrapedAt": "2026-01-01T00:00:00.000Z",
  "images": [{ "key": "idols/.../images/0.jpg", "originalUrl": "https://..." }],
}
```

---

## Step 2: DB 取り込み（import-to-db）

```bash
cd packages/scraper
bun run import-to-db
```

### 処理の流れ

1. R2 から `idols/*/profile.json` を全件取得
2. `idols` テーブルに name + group でアイドルを upsert
3. `idol_photos` テーブルに画像URLを insert（既存レコードは一度削除して再 insert）

> **注意**: 既存アイドルの `idol_photos` を削除してから再 insert するため、投票データがある状態で再実行すると FK 制約違反が発生する。投票活動が始まる前に限って再実行すること。

---

## パーサー

`src/scrape/parsers/` にページごとのパーサーを分離している。

| ファイル         | 対象ページ     | 取得内容                            |
| ---------------- | -------------- | ----------------------------------- |
| `idol-list.ts`   | `/idol?page=N` | アイドルの naviIdolId と URL の一覧 |
| `idol-detail.ts` | `/idol/<id>`   | 名前、グループ、画像URL一覧         |

各パーサーには `__fixtures__/` と `__tests__/` が対になっており、HTML フィクスチャに対するユニットテストで動作を保証している。
