import { createDb } from "@oshi-idol/db";
import { idols } from "@oshi-idol/db/schema/idols";
import { asc, desc } from "drizzle-orm";

import { publicProcedure, router } from "../index";

export const rankingRouter = router({
  top10: publicProcedure.query(async () => {
    const db = createDb();
    const top = await db.query.idols.findMany({
      with: { photos: true },
      orderBy: [desc(idols.eloRating), asc(idols.name)],
      limit: 10,
    });

    return top.map((idol, index) => {
      const total = idol.wins + idol.losses;
      const winRate = total === 0 ? 0 : idol.wins / total;
      const mainPhoto = idol.photos.find((p) => p.sortOrder === 0) ?? idol.photos[0] ?? null;

      return {
        rank: index + 1,
        id: idol.id,
        name: idol.name,
        group: idol.group,
        eloRating: idol.eloRating,
        wins: idol.wins,
        losses: idol.losses,
        winRate,
        photo: mainPhoto ? { id: mainPhoto.id, imageUrl: mainPhoto.imageUrl } : null,
      };
    });
  }),
});
