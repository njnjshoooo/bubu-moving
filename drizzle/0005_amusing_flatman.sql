CREATE INDEX `inquiries_assigned_created` ON `inquiries` (`assigned_to`,`created_at`);--> statement-breakpoint
CREATE INDEX `quotes_assigned_updated` ON `quotes` (`assigned_to`,`updated_at`);