import { beforeEach, describe, expect, test } from "vitest";

import type { TestDb } from "@oshi-idol/db/test";
import { getTestDb, runMigrations } from "@oshi-idol/db/test";
import { idolPhotos, idols } from "@oshi-idol/db/schema/idols";
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

  test("投票を送信するとレーティングが更新され投票レコードが作成される", async () => {
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

    const caller = createCaller({ auth: null, session: null, db });

    const result = await caller.submit({
      winnerId: winner!.id,
      loserId: loser!.id,
      winnerPhotoId: winnerPhoto!.id,
      loserPhotoId: loserPhoto!.id,
      sessionId: "test-session",
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
  });

  test("winner が見つからない場合は NOT_FOUND エラーになる", async () => {
    const caller = createCaller({ auth: null, session: null, db });

    await expect(
      caller.submit({
        winnerId: "nonexistent-id",
        loserId: "another-id",
        winnerPhotoId: "photo-id",
        loserPhotoId: "photo-id",
        sessionId: "test-session",
      }),
    ).rejects.toThrow("Winner not found");
  });
});
