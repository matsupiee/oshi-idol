PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`winner_id` text NOT NULL,
	`loser_id` text NOT NULL,
	`winner_photo_id` text NOT NULL,
	`loser_photo_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`winner_id`) REFERENCES `idols`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_id`) REFERENCES `idols`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_photo_id`) REFERENCES `idol_photos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_photo_id`) REFERENCES `idol_photos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_votes`("id", "winner_id", "loser_id", "winner_photo_id", "loser_photo_id", "user_id", "created_at", "updated_at") SELECT "id", "winner_id", "loser_id", "winner_photo_id", "loser_photo_id", "user_id", "created_at", "updated_at" FROM `votes`;--> statement-breakpoint
DROP TABLE `votes`;--> statement-breakpoint
ALTER TABLE `__new_votes` RENAME TO `votes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `votes_winnerId_idx` ON `votes` (`winner_id`);--> statement-breakpoint
CREATE INDEX `votes_loserId_idx` ON `votes` (`loser_id`);--> statement-breakpoint
CREATE INDEX `votes_userId_idx` ON `votes` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `is_anonymous` integer DEFAULT false;