import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { idolPhotos } from "./idol_photos";
import { votes } from "./votes";

export const idols = sqliteTable("idols", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  group: text("group").notNull(),
  eloRating: integer("elo_rating").default(1500),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const idolRelations = relations(idols, ({ many }) => ({
  photos: many(idolPhotos),
  winsAsWinner: many(votes, { relationName: "winner" }),
  winsAsLoser: many(votes, { relationName: "loser" }),
}));
