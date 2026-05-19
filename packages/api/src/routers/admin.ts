import { createDb } from "@oshi-idol/db";
import { idolPhotos, idols } from "@oshi-idol/db/schema/idols";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const adminRouter = router({
  idols: router({
    list: protectedProcedure.query(async () => {
      const db = createDb();
      const result = await db.query.idols.findMany({
        with: { photos: true },
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

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          group: z.string(),
          imageUrls: z.array(z.string()),
        }),
      )
      .mutation(async ({ input }) => {
        const db = createDb();
        const [idol] = await db
          .insert(idols)
          .values({ name: input.name, group: input.group })
          .returning();

        if (!idol) {
          throw new Error("Failed to create idol");
        }

        if (input.imageUrls.length > 0) {
          await db.insert(idolPhotos).values(
            input.imageUrls.map((url, index) => ({
              idolId: idol.id,
              imageUrl: url,
              sortOrder: index,
            })),
          );
        }

        return { id: idol.id };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const db = createDb();
      await db.delete(idols).where(eq(idols.id, input.id));
      return { success: true };
    }),

    importCsv: protectedProcedure
      .input(z.object({ csv: z.string() }))
      .mutation(async ({ input }) => {
        const db = createDb();
        const lines = input.csv.trim().split("\n");
        const dataLines = lines.slice(1);

        const grouped = new Map<string, { name: string; group: string; imageUrls: string[] }>();

        for (const line of dataLines) {
          const parts = line.split(",");
          const name = parts[0]?.trim() ?? "";
          const group = parts[1]?.trim() ?? "";
          const imageUrl = parts[2]?.trim() ?? "";
          if (!name || !group) continue;

          const key = `${name}__${group}`;
          const existing = grouped.get(key);
          if (existing) {
            if (imageUrl) existing.imageUrls.push(imageUrl);
          } else {
            grouped.set(key, { name, group, imageUrls: imageUrl ? [imageUrl] : [] });
          }
        }

        let created = 0;
        let updated = 0;

        for (const entry of grouped.values()) {
          const existing = await db.query.idols.findFirst({
            where: (t, { and }) => and(eq(t.name, entry.name), eq(t.group, entry.group)),
          });

          if (existing) {
            if (entry.imageUrls.length > 0) {
              const currentPhotos = await db.query.idolPhotos.findMany({
                where: eq(idolPhotos.idolId, existing.id),
              });
              const nextSortOrder = currentPhotos.length;
              await db.insert(idolPhotos).values(
                entry.imageUrls.map((url, index) => ({
                  idolId: existing.id,
                  imageUrl: url,
                  sortOrder: nextSortOrder + index,
                })),
              );
            }
            updated++;
          } else {
            const [idol] = await db
              .insert(idols)
              .values({ name: entry.name, group: entry.group })
              .returning();

            if (idol && entry.imageUrls.length > 0) {
              await db.insert(idolPhotos).values(
                entry.imageUrls.map((url, index) => ({
                  idolId: idol.id,
                  imageUrl: url,
                  sortOrder: index,
                })),
              );
            }
            created++;
          }
        }

        return { created, updated };
      }),
  }),
});
