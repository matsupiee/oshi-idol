import dotenv from "dotenv";
import { eq } from "drizzle-orm";
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

const db = drizzle(async (sql, params, method) => {
  const res = await fetch(d1BaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
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

async function importIdol(profile: ProfileJson): Promise<void> {
  const [upserted] = await db
    .insert(idols)
    .values({ naviIdolId: profile.naviIdolId, name: profile.name, group: profile.group })
    .onConflictDoUpdate({
      target: idols.naviIdolId,
      set: { name: profile.name, group: profile.group },
    })
    .returning({ id: idols.id });

  const idolId = upserted!.id;

  await db.delete(idolPhotos).where(eq(idolPhotos.idolId, idolId));

  if (profile.images.length > 0) {
    await db.insert(idolPhotos).values(
      profile.images.map((img, index) => ({
        idolId,
        imageUrl: `${r2PublicUrl}/${img.key}`,
        sortOrder: index,
      })),
    );
  }
}

async function main(): Promise<void> {
  const allKeys = await listKeys("idols/");
  const profileKeys = allKeys.filter((k) => k.endsWith("/profile.json"));

  console.log(`Found ${profileKeys.length} profiles`);

  for (const key of profileKeys) {
    try {
      const profile = await getJson<ProfileJson>(key);
      await importIdol(profile);
      console.log(`Imported: ${profile.name} (${profile.group})`);
    } catch (err) {
      console.warn(`Failed to import ${key}:`, err);
    }
  }

  console.log("Done");
}

main().catch(console.error);
