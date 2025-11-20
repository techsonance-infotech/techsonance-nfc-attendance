import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const expenseId = parseInt(id);

    // Check if expense exists
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ 
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND' 
      }, { status: 404 });
    }

    const expense = existingExpense[0];

    // Check if expense is approved
    if (expense.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Expense must be approved before reimbursement',
        code: 'EXPENSE_NOT_APPROVED',
        currentStatus: expense.status
      }, { status: 400 });
    }

    // Check if already reimbursed
    if (expense.reimbursementStatus === 'paid') {
      return NextResponse.json({ 
        error: 'Expense already reimbursed',
        code: 'ALREADY_REIMBURSED',
        reimbursementDate: expense.reimbursementDate
      }, { status: 400 });
    }

    const currentTimestamp = new Date().toISOString();

    // Update expense with reimbursement details
    const updatedExpense = await db.update(expenses)
      .set({
        reimbursementStatus: 'paid',
        reimbursementDate: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .where(eq(expenses.id, expenseId))
      .returning();

    if (updatedExpense.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update expense',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedExpense[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}