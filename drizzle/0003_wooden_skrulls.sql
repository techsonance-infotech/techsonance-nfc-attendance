CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`expense_date` text NOT NULL,
	`status` text NOT NULL,
	`receipt_url` text,
	`approver_id` text,
	`approval_date` text,
	`reimbursement_status` text NOT NULL,
	`reimbursement_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`amount` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`client_name` text NOT NULL,
	`client_email` text NOT NULL,
	`client_address` text,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text NOT NULL,
	`subtotal` real NOT NULL,
	`tax_rate` real NOT NULL,
	`tax_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`payment_date` text NOT NULL,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`transaction_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payroll` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`basic_salary` real NOT NULL,
	`allowances` real NOT NULL,
	`deductions` real NOT NULL,
	`gross_salary` real NOT NULL,
	`net_salary` real NOT NULL,
	`pf_amount` real NOT NULL,
	`esic_amount` real NOT NULL,
	`tds_amount` real NOT NULL,
	`status` text NOT NULL,
	`payment_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `salary_components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`component_name` text NOT NULL,
	`component_type` text NOT NULL,
	`amount` real NOT NULL,
	`is_percentage` integer NOT NULL,
	`percentage_value` real,
	`is_active` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tax_calculations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`financial_year` text NOT NULL,
	`employee_id` integer NOT NULL,
	`gross_income` real NOT NULL,
	`deductions` real NOT NULL,
	`taxable_income` real NOT NULL,
	`tax_amount` real NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
