CREATE TABLE `case_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `case_studies_published_updated` ON `case_studies` (`published`,`updated_at`);