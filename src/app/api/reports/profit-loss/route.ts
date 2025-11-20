import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, expenses } from '@/db/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required date parameters
    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Both start_date and end_date are required',
        code: 'MISSING_DATE_PARAMETERS'
      }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({ 
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date values',
        code: 'INVALID_DATE_VALUES'
      }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ 
        error: 'start_date must be before or equal to end_date',
        code: 'INVALID_DATE_RANGE'
      }, { status: 400 });
    }

    // Calculate total revenue from paid invoices
    const revenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'paid'),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate)
        )
      );

    const totalRevenue = Number(revenueResult[0]?.total || 0);

    // Calculate total expenses from approved expenses
    const expensesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.status, 'approved'),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      );

    const totalExpenses = Number(expensesResult[0]?.total || 0);

    // Calculate profit/loss
    const profitLoss = totalRevenue - totalExpenses;

    // Get revenue grouped by month
    const revenueByMonthResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${invoices.issueDate})`,
        amount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'paid'),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${invoices.issueDate})`)
      .orderBy(sql`strftime('%Y-%m', ${invoices.issueDate})`);

    const revenueByMonth = revenueByMonthResult.map(row => ({
      month: row.month,
      amount: Number(row.amount),
    }));

    // Get expenses grouped by category
    const expensesByCategoryResult = await db
      .select({
        category: expenses.category,
        amount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.status, 'approved'),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    const expensesByCategory = expensesByCategoryResult.map(row => ({
      category: row.category,
      amount: Number(row.amount),
    }));

    // Get expenses grouped by month
    const expensesByMonthResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${expenses.expenseDate})`,
        amount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.status, 'approved'),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`)
      .orderBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`);

    const expensesByMonth = expensesByMonthResult.map(row => ({
      month: row.month,
      amount: Number(row.amount),
    }));

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      profitLoss,
      revenueByMonth,
      expensesByCategory,
      expensesByMonth,
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}