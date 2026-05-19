import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const idols = sqliteTable("idols", {
  id: text("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  name: text("name").notNull(),
  group: text("group").notNull(),
  eloRating: integer("elo_rating").notNull().default(1500),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const idolPhotos = sqliteTable(
  "idol_photos",
  {
    id: text("id")
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    idolId: text("idol_id")
      .notNull()
      .references(() => idols.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("idol_photos_idolId_idx").on(table.idolId)],
);

export const votes = sqliteTable(
  "votes",
  {
    id: text("id")
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    winnerId: text("winner_id")
      .notNull()
      .references(() => idols.id),
    loserId: text("loser_id")
      .notNull()
      .references(() => idols.id),
    winnerPhotoId: text("winner_photo_id")
      .notNull()
      .references(() => idolPhotos.id),
    loserPhotoId: text("loser_photo_id")
      .notNull()
      .references(() => idolPhotos.id),
    sessionId: text("session_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("votes_winnerId_idx").on(table.winnerId),
    index("votes_loserId_idx").on(table.loserId),
    index("votes_sessionId_idx").on(table.sessionId),
  ],
);

export const idolsRelations = relations(idols, ({ many }) => ({
  photos: many(idolPhotos),
  wonVotes: many(votes, { relationName: "winner" }),
  lostVotes: many(votes, { relationName: "loser" }),
}));

export const idolPhotosRelations = relations(idolPhotos, ({ one }) => ({
  idol: one(idols, {
    fields: [idolPhotos.idolId],
    references: [idols.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
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
