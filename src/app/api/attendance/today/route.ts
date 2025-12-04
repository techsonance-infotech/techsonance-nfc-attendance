import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, employees } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Role authorization check
    if (user.role !== 'admin' && user.role !== 'hr') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Admin or HR role required.',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Get all active employees
    const allEmployees = await db.select()
      .from(employees)
      .where(eq(employees.status, 'active'));

    const totalEmployees = allEmployees.length;

    // Get today's attendance records with employee details
    const todayAttendance = await db.select({
      id: attendanceRecords.id,
      employeeId: attendanceRecords.employeeId,
      date: attendanceRecords.date,
      timeIn: attendanceRecords.timeIn,
      timeOut: attendanceRecords.timeOut,
      locationLatitude: attendanceRecords.locationLatitude,
      locationLongitude: attendanceRecords.locationLongitude,
      duration: attendanceRecords.duration,
      status: attendanceRecords.status,
      checkInMethod: attendanceRecords.checkInMethod,
      readerId: attendanceRecords.readerId,
      location: attendanceRecords.location,
      tagUid: attendanceRecords.tagUid,
      idempotencyKey: attendanceRecords.idempotencyKey,
      syncedAt: attendanceRecords.syncedAt,
      metadata: attendanceRecords.metadata,
      createdAt: attendanceRecords.createdAt,
      employeeName: employees.name,
      employeeEmail: employees.email,
      employeeDepartment: employees.department,
      employeePhotoUrl: employees.photoUrl,
      employeeNfcCardId: employees.nfcCardId,
    })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(and(
        eq(attendanceRecords.date, today),
        eq(employees.status, 'active')
      ));

    // Calculate statistics
    const present = todayAttendance.length;
    const absent = totalEmployees - present;

    let late = 0;
    let onTime = 0;
    let checkedOut = 0;
    let stillWorking = 0;

    todayAttendance.forEach(record => {
      // Parse timeIn to check if late (after 9:30 AM)
      const timeInParts = record.timeIn.split(':');
      const hour = parseInt(timeInParts[0]);
      const minute = parseInt(timeInParts[1]);
      
      // Check if late (after 9:30 AM)
      if (hour > 9 || (hour === 9 && minute > 30)) {
        late++;
      } else {
        onTime++;
      }

      // Check if checked out
      if (record.timeOut) {
        checkedOut++;
      } else {
        stillWorking++;
      }
    });

    // Format records with employee details
    const records = todayAttendance.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      employee: {
        name: record.employeeName,
        email: record.employeeEmail,
        department: record.employeeDepartment,
        photoUrl: record.employeePhotoUrl,
        nfcCardId: record.employeeNfcCardId,
      },
      date: record.date,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      locationLatitude: record.locationLatitude,
      locationLongitude: record.locationLongitude,
      duration: record.duration,
      status: record.status,
      checkInMethod: record.checkInMethod,
      readerId: record.readerId,
      location: record.location,
      tagUid: record.tagUid,
      idempotencyKey: record.idempotencyKey,
      syncedAt: record.syncedAt,
      metadata: record.metadata,
      createdAt: record.createdAt,
    }));

    // Return summary and records
    return NextResponse.json({
      date: today,
      summary: {
        totalEmployees,
        present,
        absent,
        late,
        onTime,
        checkedOut,
        stillWorking,
      },
      records,
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}