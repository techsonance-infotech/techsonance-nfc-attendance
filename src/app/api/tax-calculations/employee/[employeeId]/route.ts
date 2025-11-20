import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taxCalculations } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const searchParams = request.nextUrl.searchParams;
    const financialYear = searchParams.get('financial_year');

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

    // Build query conditions
    let whereConditions = eq(taxCalculations.employeeId, employeeIdInt);

    // Add financial year filter if provided
    if (financialYear) {
      whereConditions = and(
        eq(taxCalculations.employeeId, employeeIdInt),
        eq(taxCalculations.financialYear, financialYear)
      ) as any;
    }

    // Execute query with sorting
    const results = await db
      .select()
      .from(taxCalculations)
      .where(whereConditions)
      .orderBy(desc(taxCalculations.calculatedAt));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET tax calculations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}