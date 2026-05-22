import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import dotenv from "dotenv";

import { getJson, listKeys } from "./r2";

dotenv.config();

const MAX_PROFILES = 100;

interface ProfileJson {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ key: string; originalUrl: string }>;
}

type SeedEntry = {
  naviIdolId: string;
  name: string;
  group: string;
  images: Array<{ imageUrl: string }>;
};

const r2PublicUrl = process.env.R2_PUBLIC_URL;
if (!r2PublicUrl) {
  throw new Error("R2_PUBLIC_URL が設定されていません (.env を確認してください)");
}

async function main(): Promise<void> {
  console.log("R2 からアイドルプロフィールを取得中...");

  const allKeys = await listKeys("idols/");
  const profileKeys = allKeys.filter((k) => k.endsWith("/profile.json")).slice(0, MAX_PROFILES);

  console.log(`${profileKeys.length} 件のプロフィールを取得します`);

  const entries: SeedEntry[] = [];

  for (const key of profileKeys) {
    try {
      const profile = await getJson<ProfileJson>(key);
      entries.push({
        naviIdolId: profile.naviIdolId,
        name: profile.name,
        group: profile.group,
        images: profile.images.map((img) => ({
          imageUrl: `${r2PublicUrl}/${img.key}`,
        })),
      });
      console.log(`  取得: ${profile.name} (${profile.group})`);
    } catch (err) {
      console.warn(`  スキップ: ${key}`, err);
    }
  }

  const outputDir = resolve(import.meta.dirname, "../../db/src/fixtures");
  const outputPath = resolve(outputDir, "seed-data.json");

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(entries, null, 2) + "\n");

  console.log(`\n${entries.length} 件を保存: ${outputPath}`);
}

main().catch(console.error);
