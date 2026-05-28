import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols, votes } from "@oshi-idol/db/schema/idols";
import { user } from "@oshi-idol/db/schema/auth";

import { t } from "../../index";
import { idolsRouter } from "../idols";

const createCaller = t.createCallerFactory(idolsRouter);

describe("idols.byId", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = getTestDb();
    await runMigrations(db);
  });

  test("存在するアイドルを返す", async () => {
    const [idol] = await db
      .insert(idols)
      .values({ name: "Sakura", group: "LE SSERAFIM", eloRating: 1620, wins: 127, losses: 23 })
      .returning();

    await db
      .insert(idolPhotos)
      .values({ idolId: idol!.id, imageUrl: "https://example.com/sakura.jpg", sortOrder: 0 });

    const caller = createCaller({ auth: null, session: null, db });
    const result = await caller.byId({ id: idol!.id });

    expect(result.id).toBe(idol!.id);
    expect(result.name).toBe("Sakura");
    expect(result.group).toBe("LE SSERAFIM");
    expect(result.eloRating).toBe(1620);
    expect(result.wins).toBe(127);
    expect(result.losses).toBe(23);
    expect(Math.round(result.winRate * 100)).toBe(85);
    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]!.imageUrl).toBe("https://example.com/sakura.jpg");
  });

  test("存在しない id は NOT_FOUND を投げる", async () => {
    const caller = createCaller({ auth: null, session: null, db });
    await expect(caller.byId({ id: "nonexistent" })).rejects.toThrow(/NOT_FOUND|Idol not found/);
  });

  test("wins + losses が 0 のとき winRate は 0 を返す", async () => {
    const [idol] = await db
      .insert(idols)
      .values({ name: "NewIdol", group: "G", wins: 0, losses: 0 })
      .returning();

    const caller = createCaller({ auth: null, session: null, db });
    const result = await caller.byId({ id: idol!.id });

    expect(result.winRate).toBe(0);
  });
});

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

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });
    const pairs = await caller.battleQueue({ count: 3 });

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

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });
    const pairs = await caller.battleQueue({ count: 3 });

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

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });
    const pairs = await caller.battleQueue({ count: 5 });

    const seenIds = new Set<string>();
    for (const pair of pairs) {
      expect(seenIds.has(pair.idolA.id)).toBe(false);
      expect(seenIds.has(pair.idolB.id)).toBe(false);
      seenIds.add(pair.idolA.id);
      seenIds.add(pair.idolB.id);
    }
  });

  test("過去に投票済みのアイドルはペアに含まれない", async () => {
    const [testUser] = await db
      .insert(user)
      .values({
        id: "test-user-id",
        name: "匿名ユーザー",
        email: "anon@test.com",
        emailVerified: false,
        isAnonymous: true,
      })
      .returning();

    const inserted = await db
      .insert(idols)
      .values([
        { name: "A", group: "G" },
        { name: "B", group: "G" },
        { name: "C", group: "G" },
        { name: "D", group: "G" },
      ])
      .returning();

    const insertedPhotos = await db
      .insert(idolPhotos)
      .values(
        inserted.map((idol) => ({
          idolId: idol.id,
          imageUrl: `https://example.com/${idol.id}.jpg`,
        })),
      )
      .returning();

    const photoForA = insertedPhotos.find((p) => p.idolId === inserted[0]!.id)!;
    const photoForB = insertedPhotos.find((p) => p.idolId === inserted[1]!.id)!;

    await db.insert(votes).values({
      winnerId: inserted[0]!.id,
      loserId: inserted[1]!.id,
      winnerPhotoId: photoForA.id,
      loserPhotoId: photoForB.id,
      userId: testUser!.id,
    });

    const mockSession = {
      session: {
        id: "test-session-id",
        userId: testUser!.id,
        expiresAt: new Date(Date.now() + 86400000),
        token: "test-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: testUser!,
    };

    const caller = createCaller({ auth: null, session: mockSession, db, ipAddress: null });
    const pairs = await caller.battleQueue({ count: 1 });

    expect(pairs).toHaveLength(1);
    const votedIds = [inserted[0]!.id, inserted[1]!.id];
    expect(votedIds).not.toContain(pairs[0]!.idolA.id);
    expect(votedIds).not.toContain(pairs[0]!.idolB.id);
  });

  test("アイドルが 2 人未満の場合は NOT_FOUND を投げる", async () => {
    const [idol] = await db
      .insert(idols)
      .values([{ name: "A", group: "G" }])
      .returning();

    await db
      .insert(idolPhotos)
      .values({ idolId: idol!.id, imageUrl: `https://example.com/${idol!.id}.jpg` });

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });

    await expect(caller.battleQueue({ count: 1 })).rejects.toThrow(/Not enough idols/);
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

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });
    // 2人しかいないので count=10 を要求しても 1 ペアしか返せない
    const pairs = await caller.battleQueue({ count: 10 });

    expect(pairs).toHaveLength(1);
  });

  test("投票済みアイドルで 2 体未満しか残らない場合は全プールにフォールバックして異なる 2 体を返す", async () => {
    const [testUser] = await db
      .insert(user)
      .values({
        id: "test-user-fallback",
        name: "匿名ユーザー",
        email: "anon-fallback@test.com",
        emailVerified: false,
        isAnonymous: true,
      })
      .returning();

    const inserted = await db
      .insert(idols)
      .values([
        { name: "A", group: "G" },
        { name: "B", group: "G" },
      ])
      .returning();

    const insertedPhotos = await db
      .insert(idolPhotos)
      .values(
        inserted.map((idol) => ({
          idolId: idol.id,
          imageUrl: `https://example.com/${idol.id}.jpg`,
        })),
      )
      .returning();

    const photoForA = insertedPhotos.find((p) => p.idolId === inserted[0]!.id)!;
    const photoForB = insertedPhotos.find((p) => p.idolId === inserted[1]!.id)!;

    // 2体とも投票済みにして除外後に 0 体になる状況を作る
    await db.insert(votes).values({
      winnerId: inserted[0]!.id,
      loserId: inserted[1]!.id,
      winnerPhotoId: photoForA.id,
      loserPhotoId: photoForB.id,
      userId: testUser!.id,
    });

    const mockSession = {
      session: {
        id: "test-session-fallback",
        userId: testUser!.id,
        expiresAt: new Date(Date.now() + 86400000),
        token: "test-token-fallback",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: testUser!,
    };

    const caller = createCaller({ auth: null, session: mockSession, db, ipAddress: null });
    // 全投票済みでもフォールバックして 2 体のペアを返す
    const pairs = await caller.battleQueue({ count: 1 });

    expect(pairs).toHaveLength(1);
    const pair = pairs[0]!;
    expect(pair.idolA.id).not.toBe(pair.idolB.id);
    const allIds = inserted.map((i) => i.id);
    expect(allIds).toContain(pair.idolA.id);
    expect(allIds).toContain(pair.idolB.id);
  });

  test("session がない場合は除外なしで全アイドルを対象にする", async () => {
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

    const caller = createCaller({ auth: null, session: null, db, ipAddress: null });
    const pairs = await caller.battleQueue({ count: 1 });

    expect(pairs).toHaveLength(1);
  });
});
