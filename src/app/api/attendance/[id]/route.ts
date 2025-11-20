import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const attendanceId = parseInt(id);

    // Check if attendance record exists
    const existingRecord = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, attendanceId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { 
          error: 'Attendance record not found',
          code: 'RECORD_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const currentRecord = existingRecord[0];

    // Parse request body
    const body = await request.json();
    const { time_out, duration, status } = body;

    // Validate time_out if provided
    if (time_out !== undefined && time_out !== null) {
      const timeOutDate = new Date(time_out);
      if (isNaN(timeOutDate.getTime())) {
        return NextResponse.json(
          { 
            error: 'time_out must be a valid ISO timestamp',
            code: 'INVALID_TIME_OUT'
          },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined && status !== null) {
      if (status !== 'present' && status !== 'leave') {
        return NextResponse.json(
          { 
            error: 'status must be either "present" or "leave"',
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: {
      timeOut?: string;
      duration?: number;
      status?: string;
    } = {};

    // Handle time_out and duration calculation
    if (time_out !== undefined && time_out !== null) {
      updates.timeOut = time_out;

      // Auto-calculate duration if not provided
      if (duration === undefined || duration === null) {
        const timeInDate = new Date(currentRecord.timeIn);
        const timeOutDate = new Date(time_out);
        const durationInMs = timeOutDate.getTime() - timeInDate.getTime();
        const durationInMinutes = Math.floor(durationInMs / (1000 * 60));
        updates.duration = durationInMinutes;
      } else {
        updates.duration = duration;
      }
    } else if (duration !== undefined && duration !== null) {
      // Duration provided without time_out
      updates.duration = duration;
    }

    // Handle status update
    if (status !== undefined && status !== null) {
      updates.status = status;
    }

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid fields provided for update',
          code: 'NO_UPDATES'
        },
        { status: 400 }
      );
    }

    // Update the attendance record
    const updatedRecord = await db
      .update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, attendanceId))
      .returning();

    if (updatedRecord.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update attendance record',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRecord[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}