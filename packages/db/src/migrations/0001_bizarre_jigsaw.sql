PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_idol_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`idol_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`idol_id`) REFERENCES `idols`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_idol_photos`("id", "idol_id", "image_url", "sort_order", "created_at", "updated_at") SELECT "id", "idol_id", "image_url", "sort_order", "created_at", "updated_at" FROM `idol_photos`;--> statement-breakpoint
DROP TABLE `idol_photos`;--> statement-breakpoint
ALTER TABLE `__new_idol_photos` RENAME TO `idol_photos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idol_photos_idolId_idx` ON `idol_photos` (`idol_id`);--> statement-breakpoint
CREATE TABLE `__new_idols` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`group` text NOT NULL,
	`elo_rating` integer DEFAULT 1500 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_idols`("id", "name", "group", "elo_rating", "wins", "losses", "created_at", "updated_at") SELECT "id", "name", "group", "elo_rating", "wins", "losses", "created_at", "updated_at" FROM `idols`;--> statement-breakpoint
DROP TABLE `idols`;--> statement-breakpoint
ALTER TABLE `__new_idols` RENAME TO `idols`;--> statement-breakpoint
ALTER TABLE `votes` ADD `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;