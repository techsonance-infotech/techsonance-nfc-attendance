import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, employees } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const expense = await db.select()
        .from(expenses)
        .where(eq(expenses.id, parseInt(id)))
        .limit(1);

      if (expense.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      return NextResponse.json(expense[0], { status: 200 });
    }

    // List with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');
    const category = searchParams.get('category');
    const reimbursementStatus = searchParams.get('reimbursement_status');

    let query = db.select().from(expenses);

    // Build filter conditions
    const conditions = [];

    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ 
          error: "Invalid status. Must be: pending, approved, or rejected",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(expenses.status, status));
    }

    if (employeeId) {
      if (isNaN(parseInt(employeeId))) {
        return NextResponse.json({ 
          error: "Valid employee_id is required",
          code: "INVALID_EMPLOYEE_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(expenses.employeeId, parseInt(employeeId)));
    }

    if (category) {
      conditions.push(eq(expenses.category, category));
    }

    if (reimbursementStatus) {
      if (!['pending', 'paid'].includes(reimbursementStatus)) {
        return NextResponse.json({ 
          error: "Invalid reimbursement_status. Must be: pending or paid",
          code: "INVALID_REIMBURSEMENT_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(expenses.reimbursementStatus, reimbursementStatus));
    }

    // Apply filters if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting, pagination
    const results = await query
      .orderBy(desc(expenses.expenseDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, category, description, amount, expenseDate, receiptUrl, notes } = body;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json({ 
        error: "employeeId is required",
        code: "MISSING_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    if (!category || typeof category !== 'string' || category.trim() === '') {
      return NextResponse.json({ 
        error: "category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ 
        error: "description is required",
        code: "MISSING_DESCRIPTION" 
      }, { status: 400 });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ 
        error: "Valid amount is required",
        code: "MISSING_AMOUNT" 
      }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ 
        error: "Amount must be a positive number",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    if (!expenseDate) {
      return NextResponse.json({ 
        error: "expenseDate is required",
        code: "MISSING_EXPENSE_DATE" 
      }, { status: 400 });
    }

    // Validate expenseDate is a valid date
    const parsedDate = new Date(expenseDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid expenseDate format",
        code: "INVALID_EXPENSE_DATE" 
      }, { status: 400 });
    }

    // Validate employeeId exists
    const employeeExists = await db.select()
      .from(employees)
      .where(eq(employees.id, parseInt(employeeId)))
      .limit(1);

    if (employeeExists.length === 0) {
      return NextResponse.json({ 
        error: "Employee not found",
        code: "EMPLOYEE_NOT_FOUND" 
      }, { status: 400 });
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const newExpense = await db.insert(expenses)
      .values({
        employeeId: parseInt(employeeId),
        category: category.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        expenseDate,
        status: 'pending',
        receiptUrl: receiptUrl ? receiptUrl.trim() : null,
        approverId: null,
        approvalDate: null,
        reimbursementStatus: 'pending',
        reimbursementDate: null,
        notes: notes ? notes.trim() : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newExpense[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if expense exists
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const { category, description, amount, expenseDate, receiptUrl, notes } = body;

    // Prepare update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim() === '') {
        return NextResponse.json({ 
          error: "category must be a non-empty string",
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      updates.category = category.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return NextResponse.json({ 
          error: "description must be a non-empty string",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
      updates.description = description.trim();
    }

    if (amount !== undefined) {
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return NextResponse.json({ 
          error: "amount must be a positive number",
          code: "INVALID_AMOUNT" 
        }, { status: 400 });
      }
      updates.amount = parseFloat(amount);
    }

    if (expenseDate !== undefined) {
      const parsedDate = new Date(expenseDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ 
          error: "Invalid expenseDate format",
          code: "INVALID_EXPENSE_DATE" 
        }, { status: 400 });
      }
      updates.expenseDate = expenseDate;
    }

    if (receiptUrl !== undefined) {
      updates.receiptUrl = receiptUrl ? receiptUrl.trim() : null;
    }

    if (notes !== undefined) {
      updates.notes = notes ? notes.trim() : null;
    }

    const updatedExpense = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedExpense[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if expense exists
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const deleted = await db.delete(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Expense deleted successfully',
      expense: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}