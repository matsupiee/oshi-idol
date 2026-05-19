import alchemy from "alchemy";
import { D1Database, R2Bucket, TanStackStart } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const app = await alchemy("oshi-idol");

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

const assets = await R2Bucket("assets", {
  name: "oshi-idol-assets",
});

export const web = await TanStackStart("web", {
  cwd: "../../apps/web",
  bindings: {
    DB: db,
    ASSETS: assets,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
  },
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
