CREATE TABLE `payments` (
	`trade_no` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`amount` integer NOT NULL,
	`mode` text NOT NULL,
	`merchant_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`fields` text NOT NULL,
	`gateway_trade_no` text,
	`result_code` text,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_quote` ON `payments` (`quote_id`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`inquiry_id` text,
	`content` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`token` text NOT NULL,
	`accepted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_token` ON `quotes` (`token`);--> statement-breakpoint
CREATE INDEX `quotes_inquiry` ON `quotes` (`inquiry_id`);--> statement-breakpoint
CREATE INDEX `quotes_updated` ON `quotes` (`updated_at`);