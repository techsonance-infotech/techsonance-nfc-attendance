import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses } from '@/db/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'monthly';
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Validate period
    if (period !== 'monthly' && period !== 'yearly') {
      return NextResponse.json({
        error: 'Invalid period parameter. Must be "monthly" or "yearly"',
        code: 'INVALID_PERIOD'
      }, { status: 400 });
    }

    // Validate year
    if (!year || isNaN(parseInt(year))) {
      return NextResponse.json({
        error: 'Valid year parameter is required',
        code: 'MISSING_YEAR'
      }, { status: 400 });
    }

    const yearInt = parseInt(year);
    if (yearInt < 2000 || yearInt > 2100) {
      return NextResponse.json({
        error: 'Year must be between 2000 and 2100',
        code: 'INVALID_YEAR'
      }, { status: 400 });
    }

    // Validate month for monthly period
    if (period === 'monthly') {
      if (!month || isNaN(parseInt(month))) {
        return NextResponse.json({
          error: 'Valid month parameter is required for monthly period',
          code: 'MISSING_MONTH'
        }, { status: 400 });
      }

      const monthInt = parseInt(month);
      if (monthInt < 1 || monthInt > 12) {
        return NextResponse.json({
          error: 'Month must be between 1 and 12',
          code: 'INVALID_MONTH'
        }, { status: 400 });
      }
    }

    // Build date range filters
    let dateCondition;
    
    if (period === 'monthly') {
      const monthInt = parseInt(month!);
      const startDate = `${yearInt}-${monthInt.toString().padStart(2, '0')}-01`;
      
      // Calculate last day of month
      const lastDay = new Date(yearInt, monthInt, 0).getDate();
      const endDate = `${yearInt}-${monthInt.toString().padStart(2, '0')}-${lastDay}`;
      
      dateCondition = and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      );
    } else {
      // Yearly
      const startDate = `${yearInt}-01-01`;
      const endDate = `${yearInt}-12-31`;
      
      dateCondition = and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      );
    }

    // Fetch all expenses for the period
    const allExpenses = await db.select()
      .from(expenses)
      .where(dateCondition);

    // Calculate total expenses
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate by category
    const categoryMap = new Map<string, { total: number; count: number }>();
    allExpenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || { total: 0, count: 0 };
      categoryMap.set(expense.category, {
        total: existing.total + expense.amount,
        count: existing.count + 1
      });
    });
    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count
    })).sort((a, b) => b.total - a.total);

    // Calculate by status
    const statusMap = new Map<string, { total: number; count: number }>();
    allExpenses.forEach(expense => {
      const existing = statusMap.get(expense.status) || { total: 0, count: 0 };
      statusMap.set(expense.status, {
        total: existing.total + expense.amount,
        count: existing.count + 1
      });
    });
    const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      total: data.total,
      count: data.count
    })).sort((a, b) => b.total - a.total);

    // Calculate by reimbursement status
    const reimbursementMap = new Map<string, { total: number; count: number }>();
    allExpenses.forEach(expense => {
      const existing = reimbursementMap.get(expense.reimbursementStatus) || { total: 0, count: 0 };
      reimbursementMap.set(expense.reimbursementStatus, {
        total: existing.total + expense.amount,
        count: existing.count + 1
      });
    });
    const byReimbursementStatus = Array.from(reimbursementMap.entries()).map(([reimbursementStatus, data]) => ({
      reimbursementStatus,
      total: data.total,
      count: data.count
    })).sort((a, b) => b.total - a.total);

    // Calculate by employee
    const employeeMap = new Map<number, { total: number; count: number }>();
    allExpenses.forEach(expense => {
      const existing = employeeMap.get(expense.employeeId) || { total: 0, count: 0 };
      employeeMap.set(expense.employeeId, {
        total: existing.total + expense.amount,
        count: existing.count + 1
      });
    });
    const byEmployee = Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
      employeeId,
      total: data.total,
      count: data.count
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      totalExpenses,
      byCategory,
      byStatus,
      byReimbursementStatus,
      byEmployee
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}