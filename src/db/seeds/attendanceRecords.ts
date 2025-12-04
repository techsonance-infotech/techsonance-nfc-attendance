import { db } from '@/db';
import { attendanceRecords } from '@/db/schema';

async function main() {
    const employeeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    const employeeNfcCards: Record<number, string> = {
        1: 'NFC-001-AXYZ',
        2: 'NFC-002-BKLM',
        3: 'NFC-003-CPQR',
        4: 'NFC-004-DSTU',
        5: 'NFC-005-EVWX',
        6: 'NFC-006-FYZ1',
        7: 'NFC-007-G234',
        8: 'NFC-008-H567',
        9: 'NFC-009-I890',
        10: 'NFC-010-JABC',
        11: 'NFC-011-KDEF',
        12: 'NFC-012-LGHI',
        13: 'NFC-013-MJKL',
        14: 'NFC-014-NMNO',
        15: 'NFC-015-OPQR',
        16: 'NFC-016-PSTU',
        17: 'NFC-017-QVWX',
        18: 'NFC-018-RYZ1'
    };

    const readerLocations = [
        { readerId: 'READER-001', location: 'Main Entrance Gate' },
        { readerId: 'READER-002', location: 'Floor 1 Reception' },
        { readerId: 'READER-003', location: 'Floor 2 Entry' }
    ];

    const getReaderLocation = () => {
        const rand = Math.random();
        if (rand < 0.5) return readerLocations[0];
        if (rand < 0.8) return readerLocations[1];
        return readerLocations[2];
    };

    const getTimeInStatus = () => {
        const rand = Math.random();
        if (rand < 0.70) return { type: 'present', hourRange: [8, 9] };
        if (rand < 0.90) return { type: 'late', hourRange: [9, 10.5] };
        return { type: 'half_day', hourRange: [12, 14] };
    };

    const generateTimeIn = (date: Date, hourRange: number[]) => {
        const hour = Math.floor(hourRange[0] + Math.random() * (hourRange[1] - hourRange[0]));
        const minute = Math.floor(Math.random() * 60);
        const timeIn = new Date(date);
        timeIn.setHours(hour, minute, 0, 0);
        return timeIn.toISOString();
    };

    const generateTimeOut = (timeInStr: string, isToday: boolean) => {
        if (isToday) return null;
        
        const timeIn = new Date(timeInStr);
        const workHours = 8 + Math.random() * 1.5;
        const timeOut = new Date(timeIn);
        timeOut.setHours(timeOut.getHours() + Math.floor(workHours));
        timeOut.setMinutes(timeOut.getMinutes() + Math.floor((workHours % 1) * 60));
        return timeOut.toISOString();
    };

    const calculateDuration = (timeIn: string, timeOut: string | null) => {
        if (!timeOut) return null;
        const inTime = new Date(timeIn);
        const outTime = new Date(timeOut);
        return Math.floor((outTime.getTime() - inTime.getTime()) / (1000 * 60));
    };

    const sampleRecords = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - dayOffset);
        const dateStr = currentDate.toISOString().split('T')[0];
        const isToday = dayOffset === 0;

        let employeesToCheckIn = employeeIds;
        if (isToday) {
            employeesToCheckIn = employeeIds.slice(0, 6);
        }

        for (const employeeId of employeesToCheckIn) {
            const shouldBeAbsent = Math.random() < 0.10;
            if (shouldBeAbsent && !isToday) continue;

            const statusInfo = getTimeInStatus();
            const timeIn = generateTimeIn(currentDate, statusInfo.hourRange);
            const timeOut = generateTimeOut(timeIn, isToday && Math.random() < 0.5);
            const duration = calculateDuration(timeIn, timeOut);
            const checkInMethod = Math.random() < 0.95 ? 'nfc' : 'manual';
            const readerInfo = getReaderLocation();
            const timestamp = new Date(timeIn).getTime();

            sampleRecords.push({
                employeeId,
                date: dateStr,
                timeIn,
                timeOut,
                locationLatitude: null,
                locationLongitude: null,
                duration,
                status: statusInfo.type,
                checkInMethod,
                readerId: checkInMethod === 'nfc' ? readerInfo.readerId : null,
                location: checkInMethod === 'nfc' ? readerInfo.location : null,
                tagUid: checkInMethod === 'nfc' ? employeeNfcCards[employeeId] : null,
                idempotencyKey: `CHECK-IN-${employeeId}-${dateStr}-${timestamp}`,
                syncedAt: Math.random() < 0.05 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null,
                metadata: null,
                createdAt: timeIn
            });
        }
    }

    await db.insert(attendanceRecords).values(sampleRecords);
    
    console.log(`✅ Attendance records seeder completed successfully. Generated ${sampleRecords.length} records.`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});