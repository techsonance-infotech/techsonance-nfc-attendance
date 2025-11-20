import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, expenses, payroll } from '@/db/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';

interface MonthlyData {
  month: string;
  amount: number;
}

interface OutflowMonthlyData extends MonthlyData {
  breakdown: {
    expenses: number;
    payroll: number;
  };
}

interface CashFlowResponse {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  inflowsByMonth: MonthlyData[];
  outflowsByMonth: OutflowMonthlyData[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required parameters
    if (!startDate) {
      return NextResponse.json({
        error: 'Start date is required',
        code: 'MISSING_START_DATE'
      }, { status: 400 });
    }

    if (!endDate) {
      return NextResponse.json({
        error: 'End date is required',
        code: 'MISSING_END_DATE'
      }, { status: 400 });
    }

    // Validate date format (basic ISO date validation)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return NextResponse.json({
        error: 'Invalid start date format. Use YYYY-MM-DD',
        code: 'INVALID_START_DATE_FORMAT'
      }, { status: 400 });
    }

    if (!dateRegex.test(endDate)) {
      return NextResponse.json({
        error: 'Invalid end date format. Use YYYY-MM-DD',
        code: 'INVALID_END_DATE_FORMAT'
      }, { status: 400 });
    }

    // Validate date logic
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({
        error: 'Start date must be before or equal to end date',
        code: 'INVALID_DATE_RANGE'
      }, { status: 400 });
    }

    // Calculate cash inflows (payments received)
    const inflowsResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${payments.paymentDate})`,
        amount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`
      })
      .from(payments)
      .where(
        and(
          gte(payments.paymentDate, startDate),
          lte(payments.paymentDate, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${payments.paymentDate})`);

    // Calculate cash outflows - Expenses reimbursed
    const expensesResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${expenses.reimbursementDate})`,
        amount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.reimbursementStatus, 'paid'),
          gte(expenses.reimbursementDate, startDate),
          lte(expenses.reimbursementDate, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${expenses.reimbursementDate})`);

    // Calculate cash outflows - Payroll paid
    const payrollResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${payroll.paymentDate})`,
        amount: sql<number>`COALESCE(SUM(${payroll.netSalary}), 0)`
      })
      .from(payroll)
      .where(
        and(
          eq(payroll.status, 'paid'),
          gte(payroll.paymentDate, startDate),
          lte(payroll.paymentDate, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${payroll.paymentDate})`);

    // Calculate totals
    const totalInflows = inflowsResult.reduce((sum, item) => sum + item.amount, 0);
    
    const totalExpenses = expensesResult.reduce((sum, item) => sum + item.amount, 0);
    const totalPayroll = payrollResult.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflows = totalExpenses + totalPayroll;
    
    const netCashFlow = totalInflows - totalOutflows;

    // Format inflows by month
    const inflowsByMonth: MonthlyData[] = inflowsResult.map(item => ({
      month: item.month,
      amount: item.amount
    }));

    // Create a map for expenses and payroll by month
    const expensesByMonth = new Map<string, number>();
    expensesResult.forEach(item => {
      expensesByMonth.set(item.month, item.amount);
    });

    const payrollByMonth = new Map<string, number>();
    payrollResult.forEach(item => {
      payrollByMonth.set(item.month, item.amount);
    });

    // Get all unique months from both expenses and payroll
    const allMonths = new Set<string>([
      ...expensesByMonth.keys(),
      ...payrollByMonth.keys()
    ]);

    // Format outflows by month with breakdown
    const outflowsByMonth: OutflowMonthlyData[] = Array.from(allMonths)
      .map(month => {
        const expenseAmount = expensesByMonth.get(month) || 0;
        const payrollAmount = payrollByMonth.get(month) || 0;
        
        return {
          month,
          amount: expenseAmount + payrollAmount,
          breakdown: {
            expenses: expenseAmount,
            payroll: payrollAmount
          }
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Prepare response
    const response: CashFlowResponse = {
      totalInflows,
      totalOutflows,
      netCashFlow,
      inflowsByMonth: inflowsByMonth.sort((a, b) => a.month.localeCompare(b.month)),
      outflowsByMonth
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET cash-flow error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}