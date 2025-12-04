import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, employees, user } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    // Authentication check
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 }
      );
    }

    // Validate employee ID parameter
    const employeeId = params.employeeId;
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return NextResponse.json(
        { error: 'Valid employee ID is required', code: 'INVALID_EMPLOYEE_ID' },
        { status: 400 }
      );
    }

    const employeeIdInt = parseInt(employeeId);

    // Check if employee exists
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeIdInt))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Authorization check: employee can only view their own attendance unless admin/hr
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'hr';
    const isOwnRecord = employee[0].email === currentUser.email;

    if (!isAdmin && !isOwnRecord) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to view this attendance history',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate date formats if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        {
          error: 'Invalid start_date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      );
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        {
          error: 'Invalid end_date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(attendanceRecords.employeeId, employeeIdInt)];

    if (startDate) {
      conditions.push(gte(attendanceRecords.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(attendanceRecords.date, endDate));
    }

    // Fetch attendance records with date filtering and pagination
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.timeIn))
      .limit(limit)
      .offset(offset);

    // Parse metadata for each record if it exists
    const processedRecords = records.map((record) => ({
      ...record,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
    }));

    // Return response with employee details and attendance records
    return NextResponse.json(
      {
        employee: {
          id: employee[0].id,
          name: employee[0].name,
          email: employee[0].email,
          department: employee[0].department,
          photoUrl: employee[0].photoUrl,
          status: employee[0].status,
        },
        records: processedRecords,
        pagination: {
          limit,
          offset,
          total: processedRecords.length,
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET employee attendance error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}