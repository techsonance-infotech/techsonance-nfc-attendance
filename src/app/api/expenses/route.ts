import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, employees } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // List all expenses with employee details
    // If user is employee, showing only their expenses? 
    // This is 'admin/finance' so assume listing ALL for approval.

    const allExpenses = await db.select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.expenseDate,
      status: expenses.status,
      employeeName: employees.name,
      employeeId: expenses.employeeId
    })
      .from(expenses)
      .innerJoin(employees, eq(expenses.employeeId, employees.id))
      .orderBy(desc(expenses.createdAt));

    return NextResponse.json(allExpenses, { status: 200 });

  } catch (error) {
    console.error('GET expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // In this admin view, maybe we are creating an expense on behalf of someone OR approving?
    // Usually employees submit. But assume Admin can add too.
    // Need employeeId.

    const body = await request.json();
    const { employeeId, category, description, amount, expenseDate } = body;

    if (!employeeId || !category || !description || !amount || !expenseDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newExpense = await db.insert(expenses).values({
      employeeId,
      category,
      description,
      amount,
      expenseDate,
      status: 'pending',
      reimbursementStatus: 'pending',
      createdAt: now,
      updatedAt: now
    }).returning();

    return NextResponse.json(newExpense[0], { status: 201 });

  } catch (error) {
    console.error('POST expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // For Status Updates (Approval)
  try {
    const user = await getCurrentUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
      return NextResponse.json({ error: 'Admin/HR permissions required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

    const now = new Date().toISOString();

    const updated = await db.update(expenses)
      .set({
        status,
        updatedAt: now,
        // If Approved, maybe set approverId?
        approverId: user.id,
        approvalDate: now
      })
      .where(eq(expenses.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}