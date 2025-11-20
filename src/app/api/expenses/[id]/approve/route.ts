import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    // Get expense ID from URL search params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { status, approver_id } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    if (!approver_id) {
      return NextResponse.json({ 
        error: "Approver ID is required",
        code: "MISSING_APPROVER_ID" 
      }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return NextResponse.json({ 
        error: "Status must be either 'approved' or 'rejected'",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if expense exists
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ 
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Update the expense
    const currentTimestamp = new Date().toISOString();
    const updated = await db.update(expenses)
      .set({
        status: status.toLowerCase(),
        approverId: approver_id,
        approvalDate: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update expense',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}