import { TRPCError } from "@trpc/server";
import { createDb } from "@oshi-idol/db";
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
    .mutation(async ({ input }) => {
      const db = createDb();

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

      await db.transaction(async (tx) => {
        await tx.insert(votes).values({
          winnerId: input.winnerId,
          loserId: input.loserId,
          winnerPhotoId: input.winnerPhotoId,
          loserPhotoId: input.loserPhotoId,
          sessionId: input.sessionId,
        });

        await tx
          .update(idols)
          .set({ eloRating: newWinnerRating, wins: winner.wins + 1 })
          .where(eq(idols.id, input.winnerId));

        await tx
          .update(idols)
          .set({ eloRating: newLoserRating, losses: loser.losses + 1 })
          .where(eq(idols.id, input.loserId));
      });

      return { success: true };
    }),
});
