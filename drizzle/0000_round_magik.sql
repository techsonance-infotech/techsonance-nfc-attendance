CREATE TABLE `attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`time_in` text NOT NULL,
	`time_out` text,
	`location_latitude` real,
	`location_longitude` real,
	`duration` integer,
	`status` text NOT NULL,
	`check_in_method` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`nfc_card_id` text,
	`department` text,
	`photo_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_nfc_card_id_unique` ON `employees` (`nfc_card_id`);