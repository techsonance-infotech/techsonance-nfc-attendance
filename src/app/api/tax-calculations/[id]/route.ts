import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taxCalculations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const calculation = await db
      .select()
      .from(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .limit(1);

    if (calculation.length === 0) {
      return NextResponse.json(
        { error: 'Tax calculation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(calculation[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { grossIncome, deductions, taxableIncome, taxAmount } = body;

    // Check if record exists
    const existing = await db
      .select()
      .from(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Tax calculation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate monetary values are non-negative if provided
    if (grossIncome !== undefined && grossIncome < 0) {
      return NextResponse.json(
        {
          error: 'Gross income cannot be negative',
          code: 'INVALID_GROSS_INCOME',
        },
        { status: 400 }
      );
    }

    if (deductions !== undefined && deductions < 0) {
      return NextResponse.json(
        {
          error: 'Deductions cannot be negative',
          code: 'INVALID_DEDUCTIONS',
        },
        { status: 400 }
      );
    }

    if (taxableIncome !== undefined && taxableIncome < 0) {
      return NextResponse.json(
        {
          error: 'Taxable income cannot be negative',
          code: 'INVALID_TAXABLE_INCOME',
        },
        { status: 400 }
      );
    }

    if (taxAmount !== undefined && taxAmount < 0) {
      return NextResponse.json(
        {
          error: 'Tax amount cannot be negative',
          code: 'INVALID_TAX_AMOUNT',
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, number> = {};
    if (grossIncome !== undefined) updates.grossIncome = grossIncome;
    if (deductions !== undefined) updates.deductions = deductions;
    if (taxableIncome !== undefined) updates.taxableIncome = taxableIncome;
    if (taxAmount !== undefined) updates.taxAmount = taxAmount;

    // If no updatable fields provided, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'No valid fields to update',
          code: 'NO_UPDATE_FIELDS',
        },
        { status: 400 }
      );
    }

    const updated = await db
      .update(taxCalculations)
      .set(updates)
      .where(eq(taxCalculations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update tax calculation', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists before deleting
    const existing = await db
      .select()
      .from(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Tax calculation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete tax calculation', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Tax calculation deleted successfully',
        data: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}