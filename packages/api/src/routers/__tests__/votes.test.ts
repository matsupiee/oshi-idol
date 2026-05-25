import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols, votes } from "@oshi-idol/db/schema/idols";
import { user } from "@oshi-idol/db/schema/auth";
import { eq } from "drizzle-orm";

import { t } from "../../index";
import { votesRouter } from "../votes";

const createCaller = t.createCallerFactory(votesRouter);

describe("votes.submit", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = getTestDb();
    await runMigrations(db);
  });

  test("session があれば投票を送信するとレーティングが更新され投票レコードが作成される", async () => {
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

    const [winner] = await db
      .insert(idols)
      .values({ name: "アイドルA", group: "グループA", eloRating: 1500, wins: 0, losses: 0 })
      .returning();

    const [loser] = await db
      .insert(idols)
      .values({ name: "アイドルB", group: "グループB", eloRating: 1400, wins: 0, losses: 0 })
      .returning();

    const [winnerPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: winner!.id, imageUrl: "https://example.com/a.jpg" })
      .returning();

    const [loserPhoto] = await db
      .insert(idolPhotos)
      .values({ idolId: loser!.id, imageUrl: "https://example.com/b.jpg" })
      .returning();

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

    const caller = createCaller({ auth: null, session: mockSession, db });

    const result = await caller.submit({
      winnerId: winner!.id,
      loserId: loser!.id,
      winnerPhotoId: winnerPhoto!.id,
      loserPhotoId: loserPhoto!.id,
    });

    expect(result).toEqual({ success: true });

    const updatedWinner = await db.query.idols.findFirst({
      where: eq(idols.id, winner!.id),
    });
    expect(updatedWinner!.wins).toBe(1);
    expect(updatedWinner!.eloRating).toBeGreaterThan(1500);

    const updatedLoser = await db.query.idols.findFirst({
      where: eq(idols.id, loser!.id),
    });
    expect(updatedLoser!.losses).toBe(1);
    expect(updatedLoser!.eloRating).toBeLessThan(1400);

    const voteRecord = await db.query.votes.findFirst({
      where: eq(votes.userId, testUser!.id),
    });
    expect(voteRecord).toBeDefined();
    expect(voteRecord!.userId).toBe(testUser!.id);
  });

  test("session がない場合は UNAUTHORIZED エラーになる", async () => {
    const caller = createCaller({ auth: null, session: null, db });

    await expect(
      caller.submit({
        winnerId: "some-id",
        loserId: "other-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
      }),
    ).rejects.toThrow("Authentication required");
  });

  test("winner が見つからない場合は NOT_FOUND エラーになる", async () => {
    const [testUser] = await db
      .insert(user)
      .values({
        id: "test-user-id-2",
        name: "匿名ユーザー",
        email: "anon2@test.com",
        emailVerified: false,
        isAnonymous: true,
      })
      .returning();

    const mockSession = {
      session: {
        id: "test-session-id-2",
        userId: testUser!.id,
        expiresAt: new Date(Date.now() + 86400000),
        token: "test-token-2",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: testUser!,
    };

    const caller = createCaller({ auth: null, session: mockSession, db });

    await expect(
      caller.submit({
        winnerId: "nonexistent-id",
        loserId: "another-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
      }),
    ).rejects.toThrow("Winner not found");
  });
});
