import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll } from '@/db/schema';
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

    const record = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json(
        { error: 'Payroll record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(record[0], { status: 200 });
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

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['draft', 'processed', 'paid'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            error: 'Status must be one of: draft, processed, paid',
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Validate monetary values are non-negative
    const monetaryFields = [
      'basicSalary',
      'allowances',
      'deductions',
      'grossSalary',
      'netSalary',
      'pfAmount',
      'esicAmount',
      'tdsAmount',
    ];

    for (const field of monetaryFields) {
      if (body[field] !== undefined && body[field] < 0) {
        return NextResponse.json(
          {
            error: `${field} must be non-negative`,
            code: 'INVALID_MONETARY_VALUE',
          },
          { status: 400 }
        );
      }
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Payroll record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Prepare update object with only allowed fields
    const updates: Record<string, any> = {};

    const allowedFields = [
      'basicSalary',
      'allowances',
      'deductions',
      'grossSalary',
      'netSalary',
      'pfAmount',
      'esicAmount',
      'tdsAmount',
      'status',
      'paymentDate',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(payroll)
      .set(updates)
      .where(eq(payroll.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update payroll record', code: 'UPDATE_FAILED' },
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

    // Check if record exists
    const existing = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Payroll record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete payroll record', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Payroll record deleted successfully',
        deleted: deleted[0],
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