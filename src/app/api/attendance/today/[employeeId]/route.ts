import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;

    // Validate employeeId
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return NextResponse.json(
        {
          error: 'Valid employee ID is required',
          code: 'INVALID_EMPLOYEE_ID',
        },
        { status: 400 }
      );
    }

    const employeeIdInt = parseInt(employeeId);

    // Calculate today's date in YYYY-MM-DD format
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // Query attendance record for today
    const attendanceRecord = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeIdInt),
          eq(attendanceRecords.date, todayDate)
        )
      )
      .limit(1);

    // If no record found for today
    if (attendanceRecord.length === 0) {
      return NextResponse.json(
        {
          message: 'No attendance record for today',
          data: null,
        },
        { status: 200 }
      );
    }

    // Return the attendance record
    return NextResponse.json(attendanceRecord[0], { status: 200 });
  } catch (error) {
    console.error('GET attendance record error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}