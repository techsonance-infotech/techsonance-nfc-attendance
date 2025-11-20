import { db } from '@/db';
import { attendanceRecords } from '@/db/schema';

async function main() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const sampleAttendanceRecords = [
        {
            employeeId: 1,
            date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
            locationLatitude: -6.2088,
            locationLongitude: 106.8456,
            duration: 540,
            status: 'present',
            checkInMethod: 'nfc',
            createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 2,
            date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            locationLatitude: -6.2115,
            locationLongitude: 106.8422,
            duration: 555,
            status: 'present',
            checkInMethod: 'geolocation',
            createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 3,
            date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
            locationLatitude: null,
            locationLongitude: null,
            duration: 525,
            status: 'present',
            checkInMethod: 'manual',
            createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 4,
            date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
            locationLatitude: null,
            locationLongitude: null,
            duration: 535,
            status: 'present',
            checkInMethod: 'nfc',
            createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 5,
            date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(),
            locationLatitude: -6.2044,
            locationLongitude: 106.8412,
            duration: 540,
            status: 'present',
            checkInMethod: 'geolocation',
            createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 1,
            date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
            locationLatitude: null,
            locationLongitude: null,
            duration: 575,
            status: 'present',
            checkInMethod: 'manual',
            createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 2,
            date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeIn: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
            timeOut: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
            locationLatitude: -6.2099,
            locationLongitude: 106.8445,
            duration: 540,
            status: 'present',
            checkInMethod: 'geolocation',
            createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            employeeId: 3,
            date: today.toISOString().split('T')[0],
            timeIn: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(),
            timeOut: null,
            locationLatitude: null,
            locationLongitude: null,
            duration: null,
            status: 'present',
            checkInMethod: 'nfc',
            createdAt: today.toISOString(),
        },
        {
            employeeId: 4,
            date: today.toISOString().split('T')[0],
            timeIn: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
            timeOut: null,
            locationLatitude: null,
            locationLongitude: null,
            duration: null,
            status: 'present',
            checkInMethod: 'manual',
            createdAt: today.toISOString(),
        },
        {
            employeeId: 5,
            date: today.toISOString().split('T')[0],
            timeIn: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
            timeOut: null,
            locationLatitude: null,
            locationLongitude: null,
            duration: null,
            status: 'present',
            checkInMethod: 'nfc',
            createdAt: today.toISOString(),
        },
    ];

    await db.insert(attendanceRecords).values(sampleAttendanceRecords);
    
    console.log('✅ Attendance records seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});