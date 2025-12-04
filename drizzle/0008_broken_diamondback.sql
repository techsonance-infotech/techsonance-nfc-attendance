CREATE TABLE `nfc_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_uid` text NOT NULL,
	`employee_id` integer,
	`status` text NOT NULL,
	`enrolled_at` text NOT NULL,
	`enrolled_by` text,
	`last_used_at` text,
	`reader_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enrolled_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nfc_tags_tag_uid_unique` ON `nfc_tags` (`tag_uid`);--> statement-breakpoint
CREATE TABLE `reader_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reader_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`ip_address` text,
	`last_heartbeat` text,
	`config` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reader_devices_reader_id_unique` ON `reader_devices` (`reader_id`);--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `reader_id` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `location` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `tag_uid` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `synced_at` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `metadata` text;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_records_idempotency_key_unique` ON `attendance_records` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `employees` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `enrollment_date` text;