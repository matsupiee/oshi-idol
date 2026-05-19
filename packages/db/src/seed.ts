import { createDb } from "./index";
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

async function seed() {
  const db = createDb();

  for (const idol of IDOL_DATA) {
    const slug = encodeURIComponent(idol.name);

    const [inserted] = await db
      .insert(idols)
      .values({
        name: idol.name,
        group: idol.group,
      })
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

  console.log(`Seeded ${IDOL_DATA.length} idols.`);
}

seed().catch(console.error);
