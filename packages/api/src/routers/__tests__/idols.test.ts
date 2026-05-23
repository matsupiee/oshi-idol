import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols } from "@oshi-idol/db/schema/idols";

import { t } from "../../index";
import { idolsRouter } from "../idols";

const createCaller = t.createCallerFactory(idolsRouter);

describe("idols.battleQueue", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = getTestDb();
    await runMigrations(db);
  });

  test("指定した件数のペアを返す", async () => {
    const inserted = await db
      .insert(idols)
      .values(Array.from({ length: 10 }, (_, i) => ({ name: `Idol${i}`, group: "G" })))
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const caller = createCaller({ auth: null, session: null, db });
    const pairs = await caller.battleQueue({ sessionId: "s1", count: 3 });

    expect(pairs).toHaveLength(3);
  });

  test("各ペアで idolA と idolB は常に異なるアイドル", async () => {
    const inserted = await db
      .insert(idols)
      .values(Array.from({ length: 6 }, (_, i) => ({ name: `Idol${i}`, group: "G" })))
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const caller = createCaller({ auth: null, session: null, db });
    const pairs = await caller.battleQueue({ sessionId: "s1", count: 3 });

    for (const pair of pairs) {
      expect(pair.idolA.id).not.toBe(pair.idolB.id);
    }
  });

  test("同じアイドルが複数のペアに出ない", async () => {
    const inserted = await db
      .insert(idols)
      .values(Array.from({ length: 10 }, (_, i) => ({ name: `Idol${i}`, group: "G" })))
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const caller = createCaller({ auth: null, session: null, db });
    const pairs = await caller.battleQueue({ sessionId: "s1", count: 5 });

    const seenIds = new Set<string>();
    for (const pair of pairs) {
      expect(seenIds.has(pair.idolA.id)).toBe(false);
      expect(seenIds.has(pair.idolB.id)).toBe(false);
      seenIds.add(pair.idolA.id);
      seenIds.add(pair.idolB.id);
    }
  });

  test("excludeIdolIds で指定したアイドルはペアに含まれない", async () => {
    const inserted = await db
      .insert(idols)
      .values([
        { name: "A", group: "G" },
        { name: "B", group: "G" },
        { name: "C", group: "G" },
        { name: "D", group: "G" },
      ])
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const excluded = [inserted[0]!.id, inserted[1]!.id];
    const caller = createCaller({ auth: null, session: null, db });
    const pairs = await caller.battleQueue({ sessionId: "s1", excludeIdolIds: excluded, count: 1 });

    expect(pairs).toHaveLength(1);
    expect(excluded).not.toContain(pairs[0]!.idolA.id);
    expect(excluded).not.toContain(pairs[0]!.idolB.id);
  });

  test("アイドルが 2 人未満の場合は NOT_FOUND を投げる", async () => {
    const [idol] = await db
      .insert(idols)
      .values([{ name: "A", group: "G" }])
      .returning();

    await db
      .insert(idolPhotos)
      .values({ idolId: idol!.id, imageUrl: `https://example.com/${idol!.id}.jpg` });

    const caller = createCaller({ auth: null, session: null, db });

    await expect(caller.battleQueue({ sessionId: "s1", count: 1 })).rejects.toThrow(
      /Not enough idols/,
    );
  });

  test("アイドルが足りない場合は取得できる件数だけ返す", async () => {
    const inserted = await db
      .insert(idols)
      .values([
        { name: "A", group: "G" },
        { name: "B", group: "G" },
      ])
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const caller = createCaller({ auth: null, session: null, db });
    // 2人しかいないので count=10 を要求しても 1 ペアしか返せない
    const pairs = await caller.battleQueue({ sessionId: "s1", count: 10 });

    expect(pairs).toHaveLength(1);
  });
});
