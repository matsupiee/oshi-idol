import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { idols } from "./idols";

export const idolPhotos = sqliteTable("idol_photos", {
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  idolId: text("idol_id")
    .notNull()
    .references(() => idols.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const idolPhotoRelations = relations(idolPhotos, ({ one }) => ({
  idol: one(idols, {
    fields: [idolPhotos.idolId],
    references: [idols.id],
  }),
}));
