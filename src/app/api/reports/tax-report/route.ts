import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taxCalculations, payroll, employees } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financial_year');

    // Validate required parameter
    if (!financialYear) {
      return NextResponse.json(
        { 
          error: 'Financial year parameter is required',
          code: 'MISSING_FINANCIAL_YEAR' 
        },
        { status: 400 }
      );
    }

    // Parse financial year to get start and end year
    const [startYear, endYear] = financialYear.split('-');
    if (!startYear || !endYear) {
      return NextResponse.json(
        { 
          error: 'Invalid financial year format. Expected format: YYYY-YY (e.g., 2023-24)',
          code: 'INVALID_FINANCIAL_YEAR_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Get all tax calculations for the financial year
    const taxCalcs = await db
      .select({
        id: taxCalculations.id,
        employeeId: taxCalculations.employeeId,
        financialYear: taxCalculations.financialYear,
        grossIncome: taxCalculations.grossIncome,
        deductions: taxCalculations.deductions,
        taxableIncome: taxCalculations.taxableIncome,
        taxAmount: taxCalculations.taxAmount,
        calculatedAt: taxCalculations.calculatedAt,
        employeeName: employees.name,
        employeeDepartment: employees.department,
      })
      .from(taxCalculations)
      .leftJoin(employees, eq(taxCalculations.employeeId, employees.id))
      .where(eq(taxCalculations.financialYear, financialYear));

    // Get TDS deducted from payroll for the financial year
    // Financial year format: 2023-24 means April 2023 to March 2024
    const startYearNum = parseInt(startYear);
    const endYearNum = parseInt('20' + endYear);

    const payrollRecords = await db
      .select({
        employeeId: payroll.employeeId,
        tdsAmount: payroll.tdsAmount,
        month: payroll.month,
        year: payroll.year,
      })
      .from(payroll)
      .where(
        sql`(
          (${payroll.year} = ${startYearNum} AND ${payroll.month} >= 4) OR
          (${payroll.year} = ${endYearNum} AND ${payroll.month} <= 3)
        )`
      );

    // Group TDS by employee
    const tdsByEmployee = payrollRecords.reduce((acc, record) => {
      if (!acc[record.employeeId]) {
        acc[record.employeeId] = 0;
      }
      acc[record.employeeId] += record.tdsAmount || 0;
      return acc;
    }, {} as Record<number, number>);

    // Calculate totals and group by employee
    let totalGrossIncome = 0;
    let totalDeductions = 0;
    let totalTaxableIncome = 0;
    let totalTaxAmount = 0;
    let totalTDSDeducted = 0;

    const employeeMap = new Map<number, {
      employeeId: number;
      name: string | null;
      department: string | null;
      grossIncome: number;
      deductions: number;
      taxableIncome: number;
      taxAmount: number;
      tdsDeducted: number;
    }>();

    // Process tax calculations
    for (const calc of taxCalcs) {
      const employeeId = calc.employeeId;
      
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employeeId,
          name: calc.employeeName,
          department: calc.employeeDepartment,
          grossIncome: 0,
          deductions: 0,
          taxableIncome: 0,
          taxAmount: 0,
          tdsDeducted: tdsByEmployee[employeeId] || 0,
        });
      }

      const employee = employeeMap.get(employeeId)!;
      employee.grossIncome += calc.grossIncome || 0;
      employee.deductions += calc.deductions || 0;
      employee.taxableIncome += calc.taxableIncome || 0;
      employee.taxAmount += calc.taxAmount || 0;

      totalGrossIncome += calc.grossIncome || 0;
      totalDeductions += calc.deductions || 0;
      totalTaxableIncome += calc.taxableIncome || 0;
      totalTaxAmount += calc.taxAmount || 0;
    }

    // Calculate total TDS deducted
    totalTDSDeducted = Object.values(tdsByEmployee).reduce((sum, tds) => sum + tds, 0);

    // Convert map to array
    const byEmployee = Array.from(employeeMap.values());

    // Return the complete tax report
    return NextResponse.json({
      financialYear,
      totalGrossIncome: Math.round(totalGrossIncome * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalTaxableIncome: Math.round(totalTaxableIncome * 100) / 100,
      totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
      totalTDSDeducted: Math.round(totalTDSDeducted * 100) / 100,
      byEmployee: byEmployee.map(emp => ({
        ...emp,
        grossIncome: Math.round(emp.grossIncome * 100) / 100,
        deductions: Math.round(emp.deductions * 100) / 100,
        taxableIncome: Math.round(emp.taxableIncome * 100) / 100,
        taxAmount: Math.round(emp.taxAmount * 100) / 100,
        tdsDeducted: Math.round(emp.tdsDeducted * 100) / 100,
      })),
    }, { status: 200 });

  } catch (error) {
    console.error('GET tax report error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}