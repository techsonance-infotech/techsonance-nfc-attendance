import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Employees table
export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  nfcCardId: text('nfc_card_id').unique(),
  department: text('department'),
  photoUrl: text('photo_url'),
  salary: real('salary'),
  hourlyRate: real('hourly_rate'),
  createdAt: text('created_at').notNull(),
});

// Attendance records table
export const attendanceRecords = sqliteTable('attendance_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  date: text('date').notNull(),
  timeIn: text('time_in').notNull(),
  timeOut: text('time_out'),
  locationLatitude: real('location_latitude'),
  locationLongitude: real('location_longitude'),
  duration: integer('duration'),
  status: text('status').notNull(),
  checkInMethod: text('check_in_method').notNull(),
  createdAt: text('created_at').notNull(),
});

// Invoices table
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientAddress: text('client_address'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull(),
  subtotal: real('subtotal').notNull(),
  taxRate: real('tax_rate').notNull(),
  taxAmount: real('tax_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Invoice items table
export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  amount: real('amount').notNull(),
  createdAt: text('created_at').notNull(),
});

// Payments table
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  paymentDate: text('payment_date').notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionId: text('transaction_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// Expenses table
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  expenseDate: text('expense_date').notNull(),
  status: text('status').notNull(),
  receiptUrl: text('receipt_url'),
  approverId: text('approver_id').references(() => user.id),
  approvalDate: text('approval_date'),
  reimbursementStatus: text('reimbursement_status').notNull(),
  reimbursementDate: text('reimbursement_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Payroll table
export const payroll = sqliteTable('payroll', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: real('basic_salary').notNull(),
  allowances: real('allowances').notNull(),
  deductions: real('deductions').notNull(),
  grossSalary: real('gross_salary').notNull(),
  netSalary: real('net_salary').notNull(),
  pfAmount: real('pf_amount').notNull(),
  esicAmount: real('esic_amount').notNull(),
  tdsAmount: real('tds_amount').notNull(),
  status: text('status').notNull(),
  paymentDate: text('payment_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Salary components table
export const salaryComponents = sqliteTable('salary_components', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  componentName: text('component_name').notNull(),
  componentType: text('component_type').notNull(),
  amount: real('amount').notNull(),
  isPercentage: integer('is_percentage', { mode: 'boolean' }).notNull(),
  percentageValue: real('percentage_value'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Tax calculations table
export const taxCalculations = sqliteTable('tax_calculations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  financialYear: text('financial_year').notNull(),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  grossIncome: real('gross_income').notNull(),
  deductions: real('deductions').notNull(),
  taxableIncome: real('taxable_income').notNull(),
  taxAmount: real('tax_amount').notNull(),
  calculatedAt: text('calculated_at').notNull(),
});

// Invoice settings table
export const invoiceSettings = sqliteTable('invoice_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessName: text('business_name').notNull(),
  businessAddress: text('business_address'),
  businessPhone: text('business_phone'),
  businessEmail: text('business_email'),
  logoUrl: text('logo_url'),
  termsAndConditions: text('terms_and_conditions'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: text("role").notNull().default('employee'),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});