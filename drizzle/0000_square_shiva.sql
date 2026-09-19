CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`services` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT '待聯繫' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`request_fingerprint` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_request_key` ON `inquiries` (`request_key`);--> statement-breakpoint
CREATE INDEX `inquiries_created_at` ON `inquiries` (`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_fingerprint_created` ON `inquiries` (`request_fingerprint`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_owner` ON `inquiries` (`owner_id`);