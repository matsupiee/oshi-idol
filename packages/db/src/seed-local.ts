import { readdirSync } from "fs";
import { join, resolve } from "path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { idolPhotos } from "./schema/idol_photos";
import { idols } from "./schema/idols";

const IDOL_DATA = [
  { name: "カズハ", group: "LE SSERAFIM" },
  { name: "サクラ", group: "LE SSERAFIM" },
  { name: "チェウォン", group: "LE SSERAFIM" },
  { name: "ウンチェ", group: "LE SSERAFIM" },
  { name: "ユンジン", group: "LE SSERAFIM" },
  { name: "ウィンター", group: "aespa" },
  { name: "カリナ", group: "aespa" },
  { name: "ジゼル", group: "aespa" },
  { name: "ニンニン", group: "aespa" },
  { name: "ハニ", group: "NewJeans" },
  { name: "ヘリン", group: "NewJeans" },
  { name: "ダニエル", group: "NewJeans" },
  { name: "ミンジ", group: "NewJeans" },
  { name: "ヘイン", group: "NewJeans" },
];

const d1Dir = resolve(
  import.meta.dirname,
  "../../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
);

const sqliteFiles = readdirSync(d1Dir).filter(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);

if (sqliteFiles.length === 0) {
  throw new Error("ローカル D1 SQLite が見つかりません。先に `bun run dev` を実行してください。");
}

async function seedFile(filePath: string) {
  const client = createClient({ url: `file:${filePath}` });
  const db = drizzle(client, { schema });

  try {
    const existing = await db.select().from(idols).limit(1);
    if (existing.length > 0) {
      console.log(`スキップ: ${filePath} (既にデータあり)`);
      return;
    }

    for (const idol of IDOL_DATA) {
      const slug = encodeURIComponent(idol.name);
      const [inserted] = await db
        .insert(idols)
        .values({ name: idol.name, group: idol.group })
        .returning();

      await db.insert(idolPhotos).values([
        {
          idolId: inserted!.id,
          imageUrl: `https://picsum.photos/seed/${slug}-1/400/600`,
          sortOrder: 0,
        },
        {
          idolId: inserted!.id,
          imageUrl: `https://picsum.photos/seed/${slug}-2/400/600`,
          sortOrder: 1,
        },
      ]);
    }

    console.log(`${IDOL_DATA.length} 件シード完了: ${filePath}`);
  } finally {
    client.close();
  }
}

for (const file of sqliteFiles) {
  await seedFile(join(d1Dir, file));
}
