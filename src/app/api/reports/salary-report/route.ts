import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll, employees } from '@/db/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Both start_date and end_date parameters are required',
          code: 'MISSING_DATE_PARAMETERS',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        {
          error: 'Invalid date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      );
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date values',
          code: 'INVALID_DATE_VALUES',
        },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        {
          error: 'start_date must be before or equal to end_date',
          code: 'INVALID_DATE_RANGE',
        },
        { status: 400 }
      );
    }

    // Fetch payroll records with employee details in date range
    const payrollRecords = await db
      .select({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employeeName: employees.name,
        department: employees.department,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.basicSalary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
        pfAmount: payroll.pfAmount,
        esicAmount: payroll.esicAmount,
        tdsAmount: payroll.tdsAmount,
        status: payroll.status,
        paymentDate: payroll.paymentDate,
        createdAt: payroll.createdAt,
      })
      .from(payroll)
      .leftJoin(employees, eq(payroll.employeeId, employees.id))
      .where(
        and(
          gte(
            sql`COALESCE(${payroll.paymentDate}, ${payroll.createdAt})`,
            startDate
          ),
          lte(
            sql`COALESCE(${payroll.paymentDate}, ${payroll.createdAt})`,
            endDate
          )
        )
      );

    // Initialize totals
    let totalSalariesPaid = 0;
    let totalPF = 0;
    let totalESIC = 0;
    let totalTDS = 0;

    // Maps for grouping
    const employeeMap = new Map<
      number,
      {
        employeeId: number;
        name: string;
        department: string | null;
        totalGross: number;
        totalNet: number;
        count: number;
      }
    >();

    const departmentMap = new Map<
      string,
      { department: string; totalGross: number; totalNet: number; count: number }
    >();

    const monthMap = new Map<
      string,
      { month: number; year: number; totalGross: number; totalNet: number; count: number }
    >();

    // Process records
    for (const record of payrollRecords) {
      // Calculate totals
      totalSalariesPaid += record.netSalary || 0;
      totalPF += record.pfAmount || 0;
      totalESIC += record.esicAmount || 0;
      totalTDS += record.tdsAmount || 0;

      // Group by employee
      if (record.employeeId) {
        const existing = employeeMap.get(record.employeeId);
        if (existing) {
          existing.totalGross += record.grossSalary || 0;
          existing.totalNet += record.netSalary || 0;
          existing.count += 1;
        } else {
          employeeMap.set(record.employeeId, {
            employeeId: record.employeeId,
            name: record.employeeName || 'Unknown',
            department: record.department || null,
            totalGross: record.grossSalary || 0,
            totalNet: record.netSalary || 0,
            count: 1,
          });
        }
      }

      // Group by department
      const dept = record.department || 'Unassigned';
      const existingDept = departmentMap.get(dept);
      if (existingDept) {
        existingDept.totalGross += record.grossSalary || 0;
        existingDept.totalNet += record.netSalary || 0;
        existingDept.count += 1;
      } else {
        departmentMap.set(dept, {
          department: dept,
          totalGross: record.grossSalary || 0,
          totalNet: record.netSalary || 0,
          count: 1,
        });
      }

      // Group by month
      const monthKey = `${record.year}-${record.month}`;
      const existingMonth = monthMap.get(monthKey);
      if (existingMonth) {
        existingMonth.totalGross += record.grossSalary || 0;
        existingMonth.totalNet += record.netSalary || 0;
        existingMonth.count += 1;
      } else {
        monthMap.set(monthKey, {
          month: record.month,
          year: record.year,
          totalGross: record.grossSalary || 0,
          totalNet: record.netSalary || 0,
          count: 1,
        });
      }
    }

    // Calculate total deductions
    const totalDeductions = totalPF + totalESIC + totalTDS;

    // Convert maps to arrays
    const byEmployee = Array.from(employeeMap.values());
    const byDepartment = Array.from(departmentMap.values());
    const byMonth = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Return salary report
    return NextResponse.json(
      {
        totalSalariesPaid: Math.round(totalSalariesPaid * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalPF: Math.round(totalPF * 100) / 100,
        totalESIC: Math.round(totalESIC * 100) / 100,
        totalTDS: Math.round(totalTDS * 100) / 100,
        byEmployee: byEmployee.map((emp) => ({
          ...emp,
          totalGross: Math.round(emp.totalGross * 100) / 100,
          totalNet: Math.round(emp.totalNet * 100) / 100,
        })),
        byDepartment: byDepartment.map((dept) => ({
          ...dept,
          totalGross: Math.round(dept.totalGross * 100) / 100,
          totalNet: Math.round(dept.totalNet * 100) / 100,
        })),
        byMonth: byMonth.map((month) => ({
          ...month,
          totalGross: Math.round(month.totalGross * 100) / 100,
          totalNet: Math.round(month.totalNet * 100) / 100,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET salary report error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}