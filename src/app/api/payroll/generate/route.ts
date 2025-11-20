import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll, employees, salaryComponents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// TDS calculation based on Indian income tax slabs (FY 2023-24)
function calculateTDS(annualIncome: number): number {
  // Standard deduction
  const standardDeduction = 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  
  let tds = 0;
  
  // New tax regime slabs
  if (taxableIncome <= 300000) {
    tds = 0;
  } else if (taxableIncome <= 600000) {
    tds = (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 900000) {
    tds = 15000 + (taxableIncome - 600000) * 0.10;
  } else if (taxableIncome <= 1200000) {
    tds = 45000 + (taxableIncome - 900000) * 0.15;
  } else if (taxableIncome <= 1500000) {
    tds = 90000 + (taxableIncome - 1200000) * 0.20;
  } else {
    tds = 150000 + (taxableIncome - 1500000) * 0.30;
  }
  
  // Monthly TDS
  return Math.round((tds / 12) * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { month, year } = body;

    // Validate required fields
    if (!month || !year) {
      return NextResponse.json(
        { 
          error: 'Month and year are required',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate month range
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { 
          error: 'Month must be between 1 and 12',
          code: 'INVALID_MONTH'
        },
        { status: 400 }
      );
    }

    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { 
          error: 'Invalid year provided',
          code: 'INVALID_YEAR'
        },
        { status: 400 }
      );
    }

    // Get all active employees
    const allEmployees = await db.select().from(employees);

    if (allEmployees.length === 0) {
      return NextResponse.json(
        { 
          error: 'No employees found in the system',
          code: 'NO_EMPLOYEES'
        },
        { status: 400 }
      );
    }

    const createdPayrollRecords = [];

    // Process each employee
    for (const employee of allEmployees) {
      // Check if payroll already exists for this employee in this month/year
      const existingPayroll = await db.select()
        .from(payroll)
        .where(
          and(
            eq(payroll.employeeId, employee.id),
            eq(payroll.month, monthNum),
            eq(payroll.year, yearNum)
          )
        )
        .limit(1);

      if (existingPayroll.length > 0) {
        return NextResponse.json(
          { 
            error: `Payroll already exists for employee ${employee.name} (ID: ${employee.id}) for ${monthNum}/${yearNum}`,
            code: 'PAYROLL_ALREADY_EXISTS'
          },
          { status: 409 }
        );
      }

      // Calculate basic salary
      let basicSalary = 0;
      if (employee.salary) {
        basicSalary = employee.salary;
      } else if (employee.hourlyRate) {
        basicSalary = employee.hourlyRate * 160; // 160 hours per month
      } else {
        // Skip employees without salary information
        continue;
      }

      // Get active salary components for this employee
      const activeComponents = await db.select()
        .from(salaryComponents)
        .where(
          and(
            eq(salaryComponents.employeeId, employee.id),
            eq(salaryComponents.isActive, true)
          )
        );

      // Calculate allowances and deductions
      let allowances = 0;
      let deductions = 0;

      for (const component of activeComponents) {
        let componentAmount = 0;

        if (component.isPercentage && component.percentageValue) {
          componentAmount = (basicSalary * component.percentageValue) / 100;
        } else {
          componentAmount = component.amount;
        }

        if (component.componentType === 'allowance') {
          allowances += componentAmount;
        } else if (component.componentType === 'deduction') {
          deductions += componentAmount;
        }
      }

      // Calculate gross salary
      const grossSalary = basicSalary + allowances;

      // Calculate PF (12% of basic salary)
      const pfAmount = Math.round((basicSalary * 0.12) * 100) / 100;

      // Calculate ESIC (0.75% of gross salary if gross < 21000)
      let esicAmount = 0;
      if (grossSalary < 21000) {
        esicAmount = Math.round((grossSalary * 0.0075) * 100) / 100;
      }

      // Calculate TDS based on annual income
      const annualIncome = grossSalary * 12;
      const tdsAmount = calculateTDS(annualIncome);

      // Calculate net salary
      const netSalary = Math.round((grossSalary - deductions - pfAmount - esicAmount - tdsAmount) * 100) / 100;

      // Create payroll record
      const newPayroll = await db.insert(payroll)
        .values({
          employeeId: employee.id,
          month: monthNum,
          year: yearNum,
          basicSalary: Math.round(basicSalary * 100) / 100,
          allowances: Math.round(allowances * 100) / 100,
          deductions: Math.round(deductions * 100) / 100,
          grossSalary: Math.round(grossSalary * 100) / 100,
          netSalary: netSalary,
          pfAmount: pfAmount,
          esicAmount: esicAmount,
          tdsAmount: tdsAmount,
          status: 'draft',
          paymentDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      createdPayrollRecords.push(newPayroll[0]);
    }

    return NextResponse.json({
      message: `Successfully generated payroll for ${createdPayrollRecords.length} employees`,
      count: createdPayrollRecords.length,
      records: createdPayrollRecords
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}