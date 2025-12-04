import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, employees } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const employeeId = searchParams.get('employee_id');
    const readerId = searchParams.get('reader_id');
    const status = searchParams.get('status');

    const conditions = [];

    if (startDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        return NextResponse.json({ 
          error: 'Invalid start_date format. Expected YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT'
        }, { status: 400 });
      }
      conditions.push(gte(attendanceRecords.date, startDate));
    }

    if (endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(endDate)) {
        return NextResponse.json({ 
          error: 'Invalid end_date format. Expected YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT'
        }, { status: 400 });
      }
      conditions.push(lte(attendanceRecords.date, endDate));
    }

    if (employeeId) {
      const empId = parseInt(employeeId);
      if (isNaN(empId)) {
        return NextResponse.json({ 
          error: 'Invalid employee_id',
          code: 'INVALID_EMPLOYEE_ID'
        }, { status: 400 });
      }
      conditions.push(eq(attendanceRecords.employeeId, empId));
    }

    if (readerId) {
      conditions.push(eq(attendanceRecords.readerId, readerId));
    }

    if (status) {
      const validStatuses = ['present', 'absent', 'late', 'half_day'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Must be one of: present, absent, late, half_day',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(attendanceRecords.status, status));
    }

    let query = db
      .select({
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
        employee: {
          id: employees.id,
          name: employees.name,
          email: employees.email,
          department: employees.department,
          photoUrl: employees.photoUrl,
          status: employees.status
        }
      })
      .from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.timeIn))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('GET attendance error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'hr') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only admin or hr can create manual attendance entries',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { employeeId, date, timeIn, timeOut, duration, location, readerId, notes, status } = body;

    if (!employeeId) {
      return NextResponse.json({ 
        error: 'employeeId is required',
        code: 'MISSING_EMPLOYEE_ID'
      }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ 
        error: 'date is required',
        code: 'MISSING_DATE'
      }, { status: 400 });
    }

    if (!timeIn) {
      return NextResponse.json({ 
        error: 'timeIn is required',
        code: 'MISSING_TIME_IN'
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: 'status is required',
        code: 'MISSING_STATUS'
      }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: 'Invalid date format. Expected YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }

    try {
      new Date(timeIn).toISOString();
    } catch (e) {
      return NextResponse.json({ 
        error: 'Invalid timeIn format. Expected ISO timestamp',
        code: 'INVALID_TIME_IN'
      }, { status: 400 });
    }

    if (timeOut) {
      try {
        new Date(timeOut).toISOString();
      } catch (e) {
        return NextResponse.json({ 
          error: 'Invalid timeOut format. Expected ISO timestamp',
          code: 'INVALID_TIME_OUT'
        }, { status: 400 });
      }
    }

    const validStatuses = ['present', 'absent', 'late', 'half_day'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: present, absent, late, half_day',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    if (duration !== undefined && duration !== null) {
      if (typeof duration !== 'number' || duration < 0) {
        return NextResponse.json({ 
          error: 'Duration must be a non-negative integer',
          code: 'INVALID_DURATION'
        }, { status: 400 });
      }
    }

    const employeeExists = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employeeExists.length === 0) {
      return NextResponse.json({ 
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      }, { status: 400 });
    }

    const existingAttendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.date, date)
        )
      )
      .limit(1);

    if (existingAttendance.length > 0) {
      return NextResponse.json({ 
        error: 'Attendance record already exists for this employee on this date',
        code: 'DUPLICATE_ENTRY'
      }, { status: 400 });
    }

    let calculatedDuration = duration;
    if (!calculatedDuration && timeOut) {
      const timeInMs = new Date(timeIn).getTime();
      const timeOutMs = new Date(timeOut).getTime();
      calculatedDuration = Math.floor((timeOutMs - timeInMs) / 1000 / 60);
    }

    const metadata = notes ? JSON.stringify({ notes, createdBy: user.id }) : JSON.stringify({ createdBy: user.id });

    const newAttendance = await db.insert(attendanceRecords)
      .values({
        employeeId,
        date,
        timeIn,
        timeOut: timeOut || null,
        duration: calculatedDuration || null,
        status,
        checkInMethod: 'manual',
        location: location || null,
        readerId: readerId || null,
        metadata,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newAttendance[0], { status: 201 });
  } catch (error: any) {
    console.error('POST attendance error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}