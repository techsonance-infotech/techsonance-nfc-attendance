import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Employees table
export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  nfcCardId: text('nfc_card_id').unique(),
  department: text('department'),
  photoUrl: text('photo_url'),
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