import dotenv from "dotenv";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import { idolPhotos, idols } from "@oshi-idol/db/schema/idols";

import { getJson, listKeys } from "../r2";

dotenv.config();

interface ProfileJson {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ key: string; originalUrl: string }>;
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID!;
const token = process.env.CLOUDFLARE_D1_TOKEN!;
const r2PublicUrl = process.env.R2_PUBLIC_URL!;

const d1BaseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

const db = drizzle(async (query, params, method) => {
  const res = await fetch(d1BaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: query, params }),
  });

  if (!res.ok) {
    throw new Error(`D1 HTTP error: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    success: boolean;
    result: Array<{ results: unknown[] }>;
    errors: Array<{ message: string }>;
  };

  if (!json.success) {
    throw new Error(`D1 query failed: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  const rows = (json.result[0]?.results ?? []) as Record<string, unknown>[];

  if (method === "run") {
    return { rows: [] };
  }
  if (method === "get") {
    return { rows: rows[0] ? Object.values(rows[0]) : [] };
  }
  return { rows: rows.map((row) => Object.values(row)) };
});

async function main(): Promise<void> {
  const allKeys = await listKeys("idols/");
  const profileKeys = allKeys.filter((k) => k.endsWith("/profile.json"));

  console.log(`Found ${profileKeys.length} profiles`);

  const BATCH_SIZE = 100;
  // Drizzle は $defaultFn(id) を含む 4 カラム分を param として送る: id, idolId, imageUrl, sortOrder
  // SQLite 変数上限 999 / 4 = 249 行/クエリ
  const PHOTO_CHUNK = 249;

  for (let i = 0; i < profileKeys.length; i += BATCH_SIZE) {
    const batch = profileKeys.slice(i, i + BATCH_SIZE);

    // R2 読み込みはネットワーク I/O なので並列のまま
    const profiles = (
      await Promise.all(
        batch.map(async (key) => {
          try {
            return await getJson<ProfileJson>(key);
          } catch (err) {
            console.warn(`Failed to load ${key}:`, err);
            return null;
          }
        }),
      )
    ).filter((p): p is ProfileJson => p !== null);

    if (profiles.length === 0) continue;

    // 100 件を 1 クエリでバルク upsert
    const upserted = await db
      .insert(idols)
      .values(
        profiles.map((p) => ({
          naviIdolId: p.naviIdolId,
          name: p.name,
          group: p.group,
        })),
      )
      .onConflictDoUpdate({
        target: idols.naviIdolId,
        set: {
          name: sql`excluded.name`,
          group: sql`excluded.group`,
        },
      })
      .returning({ id: idols.id, naviIdolId: idols.naviIdolId });

    const idMap = new Map(upserted.map((r) => [r.naviIdolId, r.id]));

    // バッチ内の全アイドルの写真を 1 クエリで一括削除
    await db.delete(idolPhotos).where(
      inArray(
        idolPhotos.idolId,
        upserted.map((r) => r.id),
      ),
    );

    // 全プロファイルの写真を収集
    const allPhotos = profiles.flatMap((p) => {
      const idolId = idMap.get(p.naviIdolId);
      if (!idolId) return [];
      return p.images.map((img, index) => ({
        idolId,
        imageUrl: `${r2PublicUrl}/${img.key}`,
        sortOrder: index,
      }));
    });

    // 変数上限を超えないよう 249 行ずつ insert
    for (let j = 0; j < allPhotos.length; j += PHOTO_CHUNK) {
      await db.insert(idolPhotos).values(allPhotos.slice(j, j + PHOTO_CHUNK));
    }

    for (const p of profiles) {
      console.log(`Imported: ${p.name} (${p.group})`);
    }
  }

  console.log("Done");
}

main().catch(console.error);
