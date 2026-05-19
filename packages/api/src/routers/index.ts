import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createDb } from "@oshi-idol/db";
import { idols, votes } from "@oshi-idol/db/schema/index";
import { calculateBattleResult } from "../lib/elo";
import { publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  idols: router({
    list: publicProcedure.query(async () => {
      const db = createDb();
      const allIdols = await db.query.idols.findMany({
        with: {
          photos: {
            orderBy: (photos, { asc }) => [asc(photos.sortOrder)],
            limit: 1,
          },
        },
        orderBy: (idolsTable, { desc }) => [desc(idolsTable.eloRating)],
      });
      return allIdols.map((idol) => ({
        id: idol.id,
        name: idol.name,
        group: idol.group,
        eloRating: idol.eloRating ?? 1500,
        wins: idol.wins ?? 0,
        losses: idol.losses ?? 0,
        photo: idol.photos[0] ? { id: idol.photos[0].id, imageUrl: idol.photos[0].imageUrl } : null,
      }));
    }),
    battlePair: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input: _input }) => {
        const db = createDb();
        const allIdols = await db.query.idols.findMany({
          with: {
            photos: {
              orderBy: (photos, { asc }) => [asc(photos.sortOrder)],
              limit: 1,
            },
          },
        });

        if (allIdols.length < 2) {
          throw new Error("Not enough idols");
        }

        const shuffled = [...allIdols].sort(() => Math.random() - 0.5);
        const idolA = shuffled[0];
        const idolB = shuffled[1];

        return {
          idolA: {
            id: idolA.id,
            name: idolA.name,
            group: idolA.group,
            photo: idolA.photos[0]
              ? { id: idolA.photos[0].id, imageUrl: idolA.photos[0].imageUrl }
              : null,
          },
          idolB: {
            id: idolB.id,
            name: idolB.name,
            group: idolB.group,
            photo: idolB.photos[0]
              ? { id: idolB.photos[0].id, imageUrl: idolB.photos[0].imageUrl }
              : null,
          },
        };
      }),
  }),
  votes: router({
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
        const loser = await db.query.idols.findFirst({
          where: eq(idols.id, input.loserId),
        });

        if (!winner || !loser) {
          throw new Error("Idol not found");
        }

        const { newWinnerRating, newLoserRating } = calculateBattleResult(
          winner.eloRating ?? 1500,
          loser.eloRating ?? 1500,
        );

        await db
          .update(idols)
          .set({
            eloRating: newWinnerRating,
            wins: sql`${idols.wins} + 1`,
          })
          .where(eq(idols.id, input.winnerId));

        await db
          .update(idols)
          .set({
            eloRating: newLoserRating,
            losses: sql`${idols.losses} + 1`,
          })
          .where(eq(idols.id, input.loserId));

        await db.insert(votes).values({
          id: crypto.randomUUID(),
          winnerId: input.winnerId,
          loserId: input.loserId,
          winnerPhotoId: input.winnerPhotoId || null,
          loserPhotoId: input.loserPhotoId || null,
          sessionId: input.sessionId,
        });

        return { success: true as const };
      }),
  }),
  ranking: router({
    top10: publicProcedure.query(async () => {
      const db = createDb();
      const topIdols = await db.query.idols.findMany({
        with: {
          photos: {
            orderBy: (photos, { asc }) => [asc(photos.sortOrder)],
            limit: 1,
          },
        },
        orderBy: (idolsTable, { desc }) => [desc(idolsTable.eloRating)],
        limit: 10,
      });

      return topIdols.map((idol, index) => {
        const wins = idol.wins ?? 0;
        const losses = idol.losses ?? 0;
        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        return {
          rank: index + 1,
          id: idol.id,
          name: idol.name,
          group: idol.group,
          eloRating: idol.eloRating ?? 1500,
          wins,
          losses,
          winRate,
          photo: idol.photos[0]
            ? { id: idol.photos[0].id, imageUrl: idol.photos[0].imageUrl }
            : null,
        };
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
