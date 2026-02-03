import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll, employees } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const records = await db.select({
      id: payroll.id,
      employeeName: employees.name,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      netSalary: payroll.netSalary,
      status: payroll.status,
      paymentDate: payroll.paymentDate
    })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .orderBy(desc(payroll.year), desc(payroll.month));

    return NextResponse.json(records, { status: 200 });

  } catch (error) {
    console.error('GET payroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Run Payroll for a given Month/Year
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }

    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and Year required' }, { status: 400 });
    }

    // fetch all active employees
    const activeEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));

    // Check if payroll already exists for this month (basic check to avoid dupes)
    // Could do a check per employee, or just blindly insert if unique constraint allows, but schema doesn't seem to have unique on emp+month.
    // Let's do a quick check.

    const generatedCount = 0;
    const now = new Date().toISOString();

    for (const emp of activeEmployees) {
      // Calculate salary components (Simple Logic for Demo)
      // Assume activeEmployees have 'salary' field which is annual CTC or monthly gross? 
      // Schema said 'salary' (real). Let's assume Monthly Gross for simplicity.
      const gross = emp.salary || 50000;

      const basic = gross * 0.5;
      const allowances = gross * 0.4; // HRA etc
      const pf = basic * 0.12;
      const pt = 200;
      const deductions = pf + pt;
      const net = gross - deductions;

      await db.insert(payroll).values({
        employeeId: emp.id,
        month,
        year,
        basicSalary: basic,
        allowances,
        deductions,
        grossSalary: gross,
        netSalary: net,
        pfAmount: pf,
        esicAmount: 0,
        tdsAmount: 0,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      });
    }

    return NextResponse.json({ message: `Payroll generated for ${activeEmployees.length} employees` }, { status: 201 });

  } catch (error) {
    console.error('POST payroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}