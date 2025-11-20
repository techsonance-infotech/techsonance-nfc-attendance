ALTER TABLE `employees` ADD `salary` real;--> statement-breakpoint
ALTER TABLE `employees` ADD `hourly_rate` real;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'employee' NOT NULL;