import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, employees } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, time_in, location_latitude, location_longitude, check_in_method } = body;

    // Validate required fields
    if (!employee_id) {
      return NextResponse.json({ 
        error: "employee_id is required",
        code: "MISSING_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    if (!time_in) {
      return NextResponse.json({ 
        error: "time_in is required",
        code: "MISSING_TIME_IN" 
      }, { status: 400 });
    }

    if (!check_in_method) {
      return NextResponse.json({ 
        error: "check_in_method is required",
        code: "MISSING_CHECK_IN_METHOD" 
      }, { status: 400 });
    }

    // Validate employee_id is a valid integer
    const employeeId = parseInt(employee_id);
    if (isNaN(employeeId)) {
      return NextResponse.json({ 
        error: "employee_id must be a valid integer",
        code: "INVALID_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    // Validate time_in is a valid ISO timestamp
    const timeInDate = new Date(time_in);
    if (isNaN(timeInDate.getTime())) {
      return NextResponse.json({ 
        error: "time_in must be a valid ISO timestamp",
        code: "INVALID_TIME_IN" 
      }, { status: 400 });
    }

    // Validate check_in_method
    const validCheckInMethods = ['manual', 'nfc', 'geolocation'];
    if (!validCheckInMethods.includes(check_in_method)) {
      return NextResponse.json({ 
        error: "check_in_method must be one of: manual, nfc, geolocation",
        code: "INVALID_CHECK_IN_METHOD" 
      }, { status: 400 });
    }

    // Verify employee exists
    const employee = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ 
        error: "Employee not found",
        code: "EMPLOYEE_NOT_FOUND" 
      }, { status: 400 });
    }

    // Generate date from time_in (format: YYYY-MM-DD)
    const date = timeInDate.toISOString().split('T')[0];

    // Create attendance record
    const newRecord = await db.insert(attendanceRecords)
      .values({
        employeeId,
        date,
        timeIn: time_in,
        timeOut: null,
        locationLatitude: location_latitude !== undefined ? location_latitude : null,
        locationLongitude: location_longitude !== undefined ? location_longitude : null,
        duration: null,
        status: 'present',
        checkInMethod: check_in_method,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Handle single record fetch by ID
    if (id) {
      const recordId = parseInt(id);
      if (isNaN(recordId)) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.id, recordId))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Record not found',
          code: "RECORD_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // Handle list with filters and pagination
    const employeeIdParam = searchParams.get('employee_id');
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build conditions array
    const conditions = [];

    if (employeeIdParam) {
      const employeeId = parseInt(employeeIdParam);
      if (!isNaN(employeeId)) {
        conditions.push(eq(attendanceRecords.employeeId, employeeId));
      }
    }

    if (dateParam) {
      conditions.push(eq(attendanceRecords.date, dateParam));
    }

    if (statusParam) {
      const validStatuses = ['present', 'leave'];
      if (validStatuses.includes(statusParam)) {
        conditions.push(eq(attendanceRecords.status, statusParam));
      }
    }

    // Build query
    let query = db.select().from(attendanceRecords);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(attendanceRecords.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const recordId = parseInt(id);
    const body = await request.json();

    // Check if record exists
    const existingRecord = await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, recordId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Record not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate check_in_method if provided
    if (body.check_in_method) {
      const validCheckInMethods = ['manual', 'nfc', 'geolocation'];
      if (!validCheckInMethods.includes(body.check_in_method)) {
        return NextResponse.json({ 
          error: "check_in_method must be one of: manual, nfc, geolocation",
          code: "INVALID_CHECK_IN_METHOD" 
        }, { status: 400 });
      }
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['present', 'leave'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ 
          error: "status must be one of: present, leave",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }

    // Validate time_out if provided
    if (body.time_out) {
      const timeOutDate = new Date(body.time_out);
      if (isNaN(timeOutDate.getTime())) {
        return NextResponse.json({ 
          error: "time_out must be a valid ISO timestamp",
          code: "INVALID_TIME_OUT" 
        }, { status: 400 });
      }
    }

    // Calculate duration if both timeIn and timeOut are available
    let duration = body.duration;
    if (body.time_out && existingRecord[0].timeIn) {
      const timeIn = new Date(existingRecord[0].timeIn);
      const timeOut = new Date(body.time_out);
      duration = Math.floor((timeOut.getTime() - timeIn.getTime()) / (1000 * 60)); // duration in minutes
    }

    // Build update object
    const updates: any = {};

    if (body.time_out !== undefined) updates.timeOut = body.time_out;
    if (body.location_latitude !== undefined) updates.locationLatitude = body.location_latitude;
    if (body.location_longitude !== undefined) updates.locationLongitude = body.location_longitude;
    if (duration !== undefined) updates.duration = duration;
    if (body.status !== undefined) updates.status = body.status;
    if (body.check_in_method !== undefined) updates.checkInMethod = body.check_in_method;

    const updated = await db.update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, recordId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const recordId = parseInt(id);

    // Check if record exists
    const existingRecord = await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, recordId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Record not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(attendanceRecords)
      .where(eq(attendanceRecords.id, recordId))
      .returning();

    return NextResponse.json({ 
      message: 'Record deleted successfully',
      record: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}