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
  // D1 API の SQL バインドパラメータ上限は約 100/クエリ
  // idols: 7 params/行 (id, navi_idol_id, name, group, elo_rating, wins, losses) + 1 (ON CONFLICT updated_at)
  //   → 最大 10 行/クエリ (10 × 7 + 1 = 71 params)
  // idolPhotos: 4 params/行 (id, idol_id, image_url, sort_order)
  //   → 最大 20 行/クエリ (20 × 4 = 80 params)
  // SELECT の inArray (idol_id IN (...)): 最大 70 件/クエリ
  const IDOL_CHUNK = 10;
  const PHOTO_CHUNK = 20;
  const SELECT_CHUNK = 70;

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

    // idols を IDOL_CHUNK 行ずつ upsert（D1 パラメータ上限対策）
    const allUpserted: Array<{ id: string; naviIdolId: string }> = [];
    for (let j = 0; j < profiles.length; j += IDOL_CHUNK) {
      const chunk = profiles.slice(j, j + IDOL_CHUNK);
      const upsertedChunk = await db
        .insert(idols)
        .values(
          chunk.map((p) => ({
            naviIdolId: p.naviIdolId,
            name: p.name,
            group: p.group,
          })),
        )
        .onConflictDoUpdate({
          target: idols.naviIdolId,
          set: {
            name: sql`excluded.name`,
            group: sql`excluded."group"`,
          },
        })
        .returning({ id: idols.id, naviIdolId: idols.naviIdolId });
      for (const r of upsertedChunk) {
        if (r.naviIdolId !== null) {
          allUpserted.push({ id: r.id, naviIdolId: r.naviIdolId });
        }
      }
    }

    const idMap = new Map(allUpserted.map((r) => [r.naviIdolId, r.id]));

    // 既存写真の imageUrl を取得して重複 INSERT を防ぐ
    // votes が idol_photos を参照しているため DELETE は行わない
    const allIds = allUpserted.map((r) => r.id);
    const existingUrlSet = new Set<string>();
    for (let j = 0; j < allIds.length; j += SELECT_CHUNK) {
      const existing = await db
        .select({ imageUrl: idolPhotos.imageUrl })
        .from(idolPhotos)
        .where(inArray(idolPhotos.idolId, allIds.slice(j, j + SELECT_CHUNK)));
      for (const p of existing) existingUrlSet.add(p.imageUrl);
    }

    // 既存 DB にない写真のみ収集
    const allPhotos = profiles.flatMap((p) => {
      const idolId = idMap.get(p.naviIdolId);
      if (!idolId) return [];
      return p.images
        .filter((img) => !existingUrlSet.has(`${r2PublicUrl}/${img.key}`))
        .map((img, index) => ({
          idolId,
          imageUrl: `${r2PublicUrl}/${img.key}`,
          sortOrder: index,
        }));
    });

    // PHOTO_CHUNK 行ずつ insert（D1 パラメータ上限対策）
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
