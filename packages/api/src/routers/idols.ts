import { TRPCError } from "@trpc/server";
import { createDb } from "@oshi-idol/db";
import { idols, votes } from "@oshi-idol/db/schema/idols";
import { desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const idolsRouter = router({
  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const db = ctx.db;
    const idol = await db.query.idols.findFirst({
      where: eq(idols.id, input.id),
      with: { photos: true },
    });

    if (!idol) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Idol not found" });
    }

    const total = idol.wins + idol.losses;
    const winRate = total === 0 ? 0 : idol.wins / total;

    return {
      id: idol.id,
      name: idol.name,
      group: idol.group,
      eloRating: idol.eloRating,
      wins: idol.wins,
      losses: idol.losses,
      winRate,
      photos: idol.photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl, sortOrder: p.sortOrder })),
    };
  }),

  list: publicProcedure.query(async () => {
    const db = createDb();
    const result = await db.query.idols.findMany({
      with: { photos: true },
      orderBy: [desc(idols.eloRating)],
    });
    return result.map((idol) => ({
      id: idol.id,
      name: idol.name,
      group: idol.group,
      eloRating: idol.eloRating,
      wins: idol.wins,
      losses: idol.losses,
      photos: idol.photos.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        sortOrder: p.sortOrder,
      })),
    }));
  }),

  battleQueue: publicProcedure
    .input(
      z.object({
        count: z.number().min(1).max(20).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db;
      const count = input.count;

      let excludeIds: string[] = [];
      if (ctx.session) {
        const userId = ctx.session.user.id;
        const userVotes = await db
          .select({ winnerId: votes.winnerId, loserId: votes.loserId })
          .from(votes)
          .where(eq(votes.userId, userId));

        const votedIds = new Set<string>();
        for (const v of userVotes) {
          votedIds.add(v.winnerId);
          votedIds.add(v.loserId);
        }
        excludeIds = [...votedIds];
      }

      let availableIdols = await db.query.idols.findMany({
        with: { photos: true },
        where: excludeIds.length > 0 ? notInArray(idols.id, excludeIds) : undefined,
      });

      if (availableIdols.length < 2 && excludeIds.length > 0) {
        availableIdols = await db.query.idols.findMany({ with: { photos: true } });
      }

      if (availableIdols.length < 2) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Not enough idols for a battle",
        });
      }

      // Fisher-Yates shuffle
      const shuffled = [...availableIdols];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }

      const pairs = [];
      for (let i = 0; i + 1 < shuffled.length && pairs.length < count; i += 2) {
        const idolA = shuffled[i]!;
        const idolB = shuffled[i + 1]!;
        const photoA =
          idolA.photos.length > 0
            ? idolA.photos[Math.floor(Math.random() * idolA.photos.length)]!
            : null;
        const photoB =
          idolB.photos.length > 0
            ? idolB.photos[Math.floor(Math.random() * idolB.photos.length)]!
            : null;

        pairs.push({
          idolA: {
            id: idolA.id,
            name: idolA.name,
            group: idolA.group,
            photo: photoA
              ? { id: photoA.id, imageUrl: photoA.imageUrl }
              : { id: null, imageUrl: null },
          },
          idolB: {
            id: idolB.id,
            name: idolB.name,
            group: idolB.group,
            photo: photoB
              ? { id: photoB.id, imageUrl: photoB.imageUrl }
              : { id: null, imageUrl: null },
          },
        });
      }

      return pairs;
    }),
});
