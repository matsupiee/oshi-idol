import { TRPCError } from "@trpc/server";
import { createDb } from "@oshi-idol/db";
import { idols } from "@oshi-idol/db/schema/idols";
import { desc, notInArray } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const idolsRouter = router({
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

  battlePair: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        excludeIdolIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db;
      const excludeIds = input.excludeIdolIds ?? [];

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
          message: "Not enough idols for a battle pair",
        });
      }

      const indexA = Math.floor(Math.random() * availableIdols.length);
      let indexB = Math.floor(Math.random() * (availableIdols.length - 1));
      if (indexB >= indexA) {
        indexB += 1;
      }

      const idolA = availableIdols[indexA];
      const idolB = availableIdols[indexB];

      if (!idolA || !idolB) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Failed to select battle pair",
        });
      }

      const photoA =
        idolA.photos.length > 0
          ? idolA.photos[Math.floor(Math.random() * idolA.photos.length)]
          : null;
      const photoB =
        idolB.photos.length > 0
          ? idolB.photos[Math.floor(Math.random() * idolB.photos.length)]
          : null;

      return {
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
      };
    }),
});
