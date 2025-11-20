import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const expense = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (expense.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense[0], { status: 200 });
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Security check: reject if user identifiers provided in body
    if ('employeeId' in body || 'employee_id' in body || 'approverId' in body || 'approver_id' in body) {
      return NextResponse.json(
        {
          error: 'User identifiers cannot be modified in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const { category, description, amount, expenseDate, receiptUrl, notes } = body;

    // Validate amount if provided
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          {
            error: 'Amount must be a positive number',
            code: 'INVALID_AMOUNT',
          },
          { status: 400 }
        );
      }
    }

    // Check if expense exists
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (category !== undefined) updates.category = category.trim();
    if (description !== undefined) updates.description = description.trim();
    if (amount !== undefined) updates.amount = amount;
    if (expenseDate !== undefined) updates.expenseDate = expenseDate;
    if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl.trim();
    if (notes !== undefined) updates.notes = notes.trim();

    const updatedExpense = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    if (updatedExpense.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update expense', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedExpense[0], { status: 200 });
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if expense exists
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedExpense = await db
      .delete(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    if (deletedExpense.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete expense', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Expense deleted successfully',
        expense: deletedExpense[0],
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