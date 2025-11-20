DROP INDEX "contracts_contract_number_unique";--> statement-breakpoint
DROP INDEX "employees_email_unique";--> statement-breakpoint
DROP INDEX "employees_nfc_card_id_unique";--> statement-breakpoint
DROP INDEX "invoices_invoice_number_unique";--> statement-breakpoint
DROP INDEX "proposals_proposal_number_unique";--> statement-breakpoint
DROP INDEX "quotations_quotation_number_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `leads` ALTER COLUMN "stage" TO "stage" text NOT NULL DEFAULT 'new';--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_contract_number_unique` ON `contracts` (`contract_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_nfc_card_id_unique` ON `employees` (`nfc_card_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `proposals_proposal_number_unique` ON `proposals` (`proposal_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `quotations_quotation_number_unique` ON `quotations` (`quotation_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `leads` ALTER COLUMN "priority" TO "priority" text DEFAULT 'medium';