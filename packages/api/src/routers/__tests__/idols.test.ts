import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols } from "@oshi-idol/db/schema/idols";

import { t } from "../../index";
import { idolsRouter } from "../idols";

const createCaller = t.createCallerFactory(idolsRouter);

describe("idols.battlePair", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = getTestDb();
    await runMigrations(db);
  });

  test("常に異なる 2 体のアイドルを返す", async () => {
    const inserted = await db
      .insert(idols)
      .values([
        { name: "A", group: "G1" },
        { name: "B", group: "G1" },
        { name: "C", group: "G2" },
      ])
      .returning();

    for (const idol of inserted) {
      await db
        .insert(idolPhotos)
        .values({ idolId: idol.id, imageUrl: `https://example.com/${idol.id}.jpg` });
    }

    const caller = createCaller({ auth: null, session: null, db });

    for (let i = 0; i < 30; i++) {
      const pair = await caller.battlePair({ sessionId: "s1" });
      expect(pair.idolA.id).not.toBe(pair.idolB.id);
    }
  });

  test("excludeIdolIds で指定したアイドルは返さない", async () => {
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

    for (let i = 0; i < 20; i++) {
      const pair = await caller.battlePair({
        sessionId: "s1",
        excludeIdolIds: excluded,
      });
      expect(excluded).not.toContain(pair.idolA.id);
      expect(excluded).not.toContain(pair.idolB.id);
    }
  });

  test("除外後に 2 体未満しか残らない場合は NOT_FOUND を投げる", async () => {
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

    await expect(
      caller.battlePair({
        sessionId: "s1",
        excludeIdolIds: [inserted[0]!.id],
      }),
    ).rejects.toThrow(/Not enough idols/);
  });

  test("excludeIdolIds 未指定でも動作する", async () => {
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
    const pair = await caller.battlePair({ sessionId: "s1" });

    expect([inserted[0]!.id, inserted[1]!.id]).toContain(pair.idolA.id);
    expect([inserted[0]!.id, inserted[1]!.id]).toContain(pair.idolB.id);
    expect(pair.idolA.id).not.toBe(pair.idolB.id);
  });
});
