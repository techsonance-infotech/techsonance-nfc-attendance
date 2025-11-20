export interface AttendanceRecord {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'present' | 'leave';
  duration?: number; // in minutes
}

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface AppSettings {
  officeLocation: OfficeLocation;
}
