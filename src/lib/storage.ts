import { AttendanceRecord, AppSettings, OfficeLocation } from '@/types/attendance';

const ATTENDANCE_KEY = 'attendance_records';
const SETTINGS_KEY = 'app_settings';

// Default office location (example: San Francisco)
const DEFAULT_SETTINGS: AppSettings = {
  officeLocation: {
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100, // 100 meters
  },
};

export const getAttendanceRecords = (): AttendanceRecord[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAttendanceRecord = (record: AttendanceRecord): void => {
  const records = getAttendanceRecords();
  const existingIndex = records.findIndex((r) => r.id === record.id);
  
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
};

export const getTodayAttendance = (): AttendanceRecord | null => {
  const today = new Date().toISOString().split('T')[0];
  const records = getAttendanceRecords();
  return records.find((r) => r.date === today) || null;
};

export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const markMissingTimeoutsAsLeave = (): void => {
  const records = getAttendanceRecords();
  const today = new Date().toISOString().split('T')[0];
  let updated = false;

  const updatedRecords = records.map((record) => {
    // Check if record is from a previous day and has no timeout
    if (record.date < today && !record.timeOut && record.status === 'present') {
      updated = true;
      return { ...record, status: 'leave' as const };
    }
    return record;
  });

  if (updated) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));
  }
};
