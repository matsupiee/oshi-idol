import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const d1Dir = resolve(
  import.meta.dirname,
  "../../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

let sqliteFile: string | undefined;
try {
  sqliteFile = readdirSync(d1Dir).find((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
} catch {
  // ディレクトリが存在しない場合
}

if (!sqliteFile) {
  console.error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
  process.exit(1);
}

const client = createClient({ url: `file:${join(d1Dir, sqliteFile)}` });

await client.execute(`
  CREATE TABLE IF NOT EXISTS d1_migrations (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const result = await client.execute("SELECT name FROM d1_migrations");
const appliedNames = new Set(result.rows.map((r) => r.name as string));

const migrationsDir = resolve(import.meta.dirname, "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
for (const file of files) {
  if (appliedNames.has(file)) continue;

  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  console.log(`Applying ${file}...`);

  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  await client.execute({
    sql: "INSERT INTO d1_migrations (name) VALUES (?)",
    args: [file],
  });

  count++;
}

console.log(count === 0 ? "No new migrations." : `Applied ${count} migration(s).`);

await client.close();
