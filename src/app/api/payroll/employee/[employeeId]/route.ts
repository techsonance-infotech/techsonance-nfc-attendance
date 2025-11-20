import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    // Validate employeeId
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return NextResponse.json(
        { 
          error: 'Valid employee ID is required',
          code: 'INVALID_EMPLOYEE_ID' 
        },
        { status: 400 }
      );
    }

    const employeeIdInt = parseInt(employeeId);

    // Build query with optional year filter
    let query = db
      .select()
      .from(payroll)
      .where(eq(payroll.employeeId, employeeIdInt));

    // Add year filter if provided
    if (year) {
      const yearInt = parseInt(year);
      if (isNaN(yearInt)) {
        return NextResponse.json(
          { 
            error: 'Invalid year format',
            code: 'INVALID_YEAR' 
          },
          { status: 400 }
        );
      }

      query = db
        .select()
        .from(payroll)
        .where(
          and(
            eq(payroll.employeeId, employeeIdInt),
            eq(payroll.year, yearInt)
          )
        );
    }

    // Execute query with sorting
    const records = await query
      .orderBy(desc(payroll.year), desc(payroll.month));

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error('GET payroll by employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}