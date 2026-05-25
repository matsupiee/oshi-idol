import { TRPCError } from "@trpc/server";
import { idols, votes } from "@oshi-idol/db/schema/idols";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { calculateBattleResult } from "../lib/elo";

export const votesRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        winnerId: z.string(),
        loserId: z.string(),
        winnerPhotoId: z.string(),
        loserPhotoId: z.string(),
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;

      const winner = await db.query.idols.findFirst({
        where: eq(idols.id, input.winnerId),
      });
      if (!winner) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Winner not found" });
      }

      const loser = await db.query.idols.findFirst({
        where: eq(idols.id, input.loserId),
      });
      if (!loser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Loser not found" });
      }

      const { newWinnerRating, newLoserRating } = calculateBattleResult(
        winner.eloRating,
        loser.eloRating,
      );

      // D1 は BEGIN をサポートしないため batch() で原子的に更新する
      await db.batch([
        db.insert(votes).values({
          winnerId: input.winnerId,
          loserId: input.loserId,
          winnerPhotoId: input.winnerPhotoId,
          loserPhotoId: input.loserPhotoId,
          sessionId: input.sessionId,
          ipAddress: ctx.ipAddress,
        }),
        db
          .update(idols)
          .set({ eloRating: newWinnerRating, wins: winner.wins + 1 })
          .where(eq(idols.id, input.winnerId)),
        db
          .update(idols)
          .set({ eloRating: newLoserRating, losses: loser.losses + 1 })
          .where(eq(idols.id, input.loserId)),
      ]);

      return { success: true };
    }),
});
