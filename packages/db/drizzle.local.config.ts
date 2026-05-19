import { readdirSync } from "fs";
import { join, resolve } from "path";

import { defineConfig } from "drizzle-kit";

const d1Dir = resolve(
  import.meta.dirname,
  "../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

const sqliteFile = readdirSync(d1Dir).find((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");

if (!sqliteFile) {
  throw new Error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
}

export default defineConfig({
  schema: "./src/schema",
  dialect: "sqlite",
  dbCredentials: {
    url: join(d1Dir, sqliteFile),
  },
});
