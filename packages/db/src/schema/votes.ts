import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { idolPhotos } from "./idol_photos";
import { idols } from "./idols";

export const votes = sqliteTable("votes", {
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  winnerId: text("winner_id").references(() => idols.id),
  loserId: text("loser_id").references(() => idols.id),
  winnerPhotoId: text("winner_photo_id").references(() => idolPhotos.id),
  loserPhotoId: text("loser_photo_id").references(() => idolPhotos.id),
  sessionId: text("session_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const voteRelations = relations(votes, ({ one }) => ({
  winner: one(idols, {
    fields: [votes.winnerId],
    references: [idols.id],
    relationName: "winner",
  }),
  loser: one(idols, {
    fields: [votes.loserId],
    references: [idols.id],
    relationName: "loser",
  }),
  winnerPhoto: one(idolPhotos, {
    fields: [votes.winnerPhotoId],
    references: [idolPhotos.id],
  }),
  loserPhoto: one(idolPhotos, {
    fields: [votes.loserPhotoId],
    references: [idolPhotos.id],
  }),
}));
