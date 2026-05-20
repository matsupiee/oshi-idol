## Deployment (Cloudflare via Alchemy)

- Target: web + server
- Dev: bun run dev
- Deploy: bun run deploy
- Destroy: bun run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## 自動デプロイ (GitHub Actions)

`main` ブランチへの push をトリガに、`.github/workflows/deploy.yml` が `bun run deploy` を実行して Cloudflare へ自動デプロイする。手動実行は GitHub の Actions タブから `workflow_dispatch` で起動できる。

同一 ref に対する並列実行は `concurrency` で抑止しているが、デプロイ途中中断を避けるため `cancel-in-progress: false` として順次実行する。

### 必要な GitHub Secrets / Variables

`production` 環境（Environment）に以下を設定する。

Secrets:

- `CLOUDFLARE_API_TOKEN` — Workers / D1 / R2 を操作できる API トークン
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare アカウント ID
- `ALCHEMY_PASSWORD` — Alchemy state 暗号化用パスワード（初回デプロイ時に決めた値を使い回す）
- `BETTER_AUTH_SECRET` — Better Auth 用シークレット

Variables（機密でない値）:

- `BETTER_AUTH_URL` — 本番の Auth エンドポイント URL
- `CORS_ORIGIN` — 許可する CORS オリジン
