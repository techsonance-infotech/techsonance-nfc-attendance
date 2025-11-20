import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords } from '@/db/schema';
import { isNull, lt, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { cutoff_date } = body;

    // Determine cutoff date (default to today)
    let cutoffDate: string;
    if (cutoff_date) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(cutoff_date)) {
        return NextResponse.json(
          {
            error: 'Invalid cutoff_date format. Expected YYYY-MM-DD',
            code: 'INVALID_DATE_FORMAT',
          },
          { status: 400 }
        );
      }

      // Validate that it's a valid date
      const parsedDate = new Date(cutoff_date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid cutoff_date value',
            code: 'INVALID_DATE',
          },
          { status: 400 }
        );
      }

      cutoffDate = cutoff_date;
    } else {
      // Default to today's date
      const today = new Date();
      cutoffDate = today.toISOString().split('T')[0];
    }

    // Find and update all attendance records with missing timeOut and date < cutoff_date
    const updatedRecords = await db
      .update(attendanceRecords)
      .set({
        status: 'leave',
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          isNull(attendanceRecords.timeOut),
          lt(attendanceRecords.date, cutoffDate)
        )
      )
      .returning();

    // Extract IDs of updated records
    const updatedRecordIds = updatedRecords.map((record) => record.id);

    return NextResponse.json(
      {
        message: `Marked ${updatedRecords.length} records as leave`,
        count: updatedRecords.length,
        updated_records: updatedRecordIds,
        cutoff_date: cutoffDate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}