import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;

    // Validate cardId parameter
    if (!cardId || cardId.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Valid NFC card ID is required',
          code: 'INVALID_CARD_ID'
        },
        { status: 400 }
      );
    }

    // Query employee by NFC card ID
    const employee = await db.select()
      .from(employees)
      .where(eq(employees.nfcCardId, cardId.trim()))
      .limit(1);

    // Check if employee exists
    if (employee.length === 0) {
      return NextResponse.json(
        { 
          error: 'Employee not found with NFC card ID',
          code: 'EMPLOYEE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Return the found employee
    return NextResponse.json(employee[0], { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}