ALTER TABLE `idols` ADD `navi_idol_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idols_navi_idol_id_unique` ON `idols` (`navi_idol_id`);