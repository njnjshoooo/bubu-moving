CREATE TABLE `catalog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`draft` text NOT NULL,
	`published_content` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dispatch_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lock_until` text,
	`last_error` text DEFAULT '' NOT NULL,
	`external_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dispatch_quote` ON `dispatch_outbox` (`quote_id`);--> statement-breakpoint
CREATE TABLE `staff` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `assigned_to` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `assigned_to` text;