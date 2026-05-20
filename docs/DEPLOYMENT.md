# デプロイ手順 (Cloudflare via Alchemy)

デプロイ先は Cloudflare Workers (web) + D1 (DB) + R2 (assets)。
インフラ定義は `packages/infra/alchemy.run.ts` で管理している。

---

## 1. Cloudflare の準備

### 1-1. アカウント ID の確認

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com) にログイン
2. 右サイドバーの **Account ID** をコピーする

### 1-2. API トークンの作成

1. ダッシュボード右上のアイコン → **My Profile** → **API Tokens**
2. **Create Token** → **Create Custom Token**
3. 以下の権限を付与する

   | リソース                         | 権限 |
   | -------------------------------- | ---- |
   | Account / Workers Scripts : Edit |
   | Account / D1 : Edit              |
   | Account / R2 Storage : Edit      |

4. **Continue to summary** → **Create Token** → トークンをコピーして保存する（一度しか表示されない）

---

## 2. ローカルからデプロイ

### 2-1. 環境変数をシェルにセット

```bash
export CLOUDFLARE_API_TOKEN=<コピーしたAPIトークン>
export CLOUDFLARE_ACCOUNT_ID=<アカウントID>
```

### 2-2. `packages/infra/.env` を編集

`ALCHEMY_PASSWORD` は Alchemy の state ファイルの暗号化に使う。
**初回デプロイ時に決めた値を以降ずっと使い続ける**（変えると state が読めなくなる）。

```
ALCHEMY_PASSWORD=<任意の強いパスワード>
```

### 2-3. `apps/web/.env` を本番向けに更新

デプロイ後の Worker URL は `bun run deploy` 実行後にコンソールに出力される。
初回は仮の URL を入れてデプロイ → URL 確定後に再度更新して再デプロイする。

```
BETTER_AUTH_SECRET=<ランダムな強いシークレット（openssl rand -base64 32 で生成可）>
BETTER_AUTH_URL=https://<本番ドメイン>
CORS_ORIGIN=https://<本番ドメイン>
```

### 2-4. デプロイ実行

```bash
bun run deploy
```

成功すると末尾に以下が出力される：

```
Web    -> https://oshi-idol.<your-subdomain>.workers.dev
```

### 2-5. 初回デプロイ後の URL 更新（初回のみ）

Worker URL が確定したら `apps/web/.env` の `BETTER_AUTH_URL` と `CORS_ORIGIN` を実際の URL に更新し、再度 `bun run deploy` を実行する。

---

## 3. 自動デプロイ (GitHub Actions)

`main` ブランチへの push をトリガに `.github/workflows/deploy.yml` が `bun run deploy` を自動実行する。
手動実行は GitHub の Actions タブ → **Deploy** → **Run workflow** から起動できる。

同一 ref への並列デプロイは `concurrency` で抑止しており、`cancel-in-progress: false` で途中中断せず順次実行する。

### 3-1. GitHub Secrets / Variables の設定

リポジトリの **Settings → Environments → production** に以下を登録する。

**Secrets（機密値）:**

| キー                    | 値                                     |
| ----------------------- | -------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | 手順 1-2 で作成した API トークン       |
| `CLOUDFLARE_ACCOUNT_ID` | 手順 1-1 で確認したアカウント ID       |
| `ALCHEMY_PASSWORD`      | `packages/infra/.env` と同じパスワード |
| `BETTER_AUTH_SECRET`    | `apps/web/.env` と同じシークレット     |

**Variables（非機密値）:**

| キー              | 値                       |
| ----------------- | ------------------------ |
| `BETTER_AUTH_URL` | `https://<本番ドメイン>` |
| `CORS_ORIGIN`     | `https://<本番ドメイン>` |

---

## 4. インフラの削除

```bash
bun run destroy
```

D1 データベース・R2 バケット・Worker がすべて削除される。**データも消えるため注意。**
