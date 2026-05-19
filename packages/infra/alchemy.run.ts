import path from "node:path";
import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const infraDir = import.meta.dirname;
const migrationsDir = path.resolve(infraDir, "../../packages/db/src/migrations");
const localWranglerDir = path.resolve(infraDir, "../../apps/web/.alchemy/local");

const app = await alchemy("oshi-idol");

const db = await D1Database("database", {
  name: app.local ? "oshi-idol-db-local" : "oshi-idol-db",
  migrationsDir: "../../packages/db/src/migrations",
});

export const web = await TanStackStart("web", {
  cwd: "../../apps/web",
  bindings: {
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
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
