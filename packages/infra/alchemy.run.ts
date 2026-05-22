import path from "node:path";
import alchemy from "alchemy";
import { D1Database, R2Bucket, TanStackStart } from "alchemy/cloudflare";
import { CloudflareStateStore, FileSystemStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const infraDir = import.meta.dirname;
const migrationsDir = path.resolve(infraDir, "../../packages/db/src/migrations");
const localWranglerDir = path.resolve(infraDir, "../../apps/web/.alchemy/local");
const isLocalDev = process.argv.includes("--dev");
const localDevUrl = "http://localhost:3001";
const localBetterAuthSecret = "local-dev-better-auth-secret-for-oshi-idol";

const app = await alchemy("oshi-idol", {
  stateStore: (scope) =>
    isLocalDev ? new FileSystemStateStore(scope) : new CloudflareStateStore(scope),
  adopt: true,
});

const db = await D1Database("database", {
  name: app.local ? "oshi-idol-db-local" : "oshi-idol-db",
  // この設定により、Alchemy が Cloudflare API を通じて D1 に対してマイグレーションを自動適用する
  migrationsDir: "../../packages/db/src/migrations",
});

const assets = await R2Bucket("assets", {
  name: "oshi-idol-assets",
});

export const web = await TanStackStart("web", {
  cwd: "../../apps/web",
  bindings: {
    DB: db,
    BUCKET: assets,
    CORS_ORIGIN: isLocalDev ? localDevUrl : alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: isLocalDev ? localBetterAuthSecret : alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: isLocalDev ? localDevUrl : alchemy.env.BETTER_AUTH_URL!,
  },
  wrangler: {
    transform: (spec) => {
      for (const database of spec.d1_databases ?? []) {
        if (database.migrations_dir) {
          database.migrations_dir = path.relative(localWranglerDir, migrationsDir);
        }
      }
      return spec;
    },
  },
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
