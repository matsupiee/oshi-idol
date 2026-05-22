import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { idolPhotos } from "./schema/idol_photos";
import { idols } from "./schema/idols";

type SeedEntry = {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ imageUrl: string }>;
};

const fixturesPath = resolve(import.meta.dirname, "fixtures/seed-data.json");
const SEED_DATA: SeedEntry[] = JSON.parse(readFileSync(fixturesPath, "utf-8")) as SeedEntry[];

if (SEED_DATA.length === 0) {
  console.log("シードデータがありません。先に `bun run db:fetch-seed-data` を実行してください。");
  process.exit(0);
}

const d1Dir = resolve(
  import.meta.dirname,
  "../../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

const candidates = readdirSync(d1Dir).filter(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);

if (candidates.length === 0) {
  throw new Error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
}

// d1_migrations レコード数が最大のファイルを選ぶ（最も進んだ正しい DB）
let bestFile = candidates[0]!;
let maxCount = -1;
for (const f of candidates) {
  try {
    const c = createClient({ url: `file:${join(d1Dir, f)}` });
    const r = await c.execute("SELECT COUNT(*) as n FROM d1_migrations");
    const n = Number(r.rows[0]?.n ?? 0);
    if (n > maxCount) {
      maxCount = n;
      bestFile = f;
    }
    c.close();
  } catch {
    // d1_migrations テーブルがない場合はスキップ
  }
}

const sqliteFiles = [bestFile];

async function seedFile(filePath: string): Promise<void> {
  const client = createClient({ url: `file:${filePath}` });
  const db = drizzle(client, { schema });

  try {
    const existing = await db.select().from(idols).limit(1);
    if (existing.length > 0) {
      console.log(`スキップ: ${filePath} (既にデータあり)`);
      return;
    }

    for (const entry of SEED_DATA) {
      const [inserted] = await db
        .insert(idols)
        .values({ naviIdolId: entry.naviIdolId, name: entry.name, group: entry.group })
        .returning();

      if (!inserted) throw new Error(`アイドルのinsertに失敗しました: ${entry.name}`);

      if (entry.images.length > 0) {
        await db.insert(idolPhotos).values(
          entry.images.map((img, index) => ({
            idolId: inserted.id,
            imageUrl: img.imageUrl,
            sortOrder: index,
          })),
        );
      }
    }

    console.log(`${SEED_DATA.length} 件シード完了: ${filePath}`);
  } finally {
    client.close();
  }
}

for (const file of sqliteFiles) {
  await seedFile(join(d1Dir, file));
}
