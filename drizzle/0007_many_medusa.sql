CREATE TABLE `invoice_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` text NOT NULL,
	`business_address` text,
	`business_phone` text,
	`business_email` text,
	`logo_url` text,
	`terms_and_conditions` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
