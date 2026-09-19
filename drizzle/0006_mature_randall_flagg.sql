CREATE TABLE `customer_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_published_order` ON `customer_reviews` (`published`,`sort_order`);