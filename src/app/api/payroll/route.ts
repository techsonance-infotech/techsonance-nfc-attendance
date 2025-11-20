import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll, employees } from '@/db/schema';
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
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(payroll)
        .where(eq(payroll.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = db.select().from(payroll);

    // Build where conditions
    const conditions = [];

    if (month) {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) {
        conditions.push(eq(payroll.month, monthNum));
      }
    }

    if (year) {
      const yearNum = parseInt(year);
      if (yearNum >= 2000 && yearNum <= 2100) {
        conditions.push(eq(payroll.year, yearNum));
      }
    }

    if (employeeId) {
      const empId = parseInt(employeeId);
      if (!isNaN(empId)) {
        conditions.push(eq(payroll.employeeId, empId));
      }
    }

    if (status) {
      if (['draft', 'processed', 'paid'].includes(status)) {
        conditions.push(eq(payroll.status, status));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(payroll.year), desc(payroll.month))
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

    // Security check: reject if userId or similar fields provided
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      employeeId,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      pfAmount,
      esicAmount,
      tdsAmount,
      status,
      paymentDate
    } = body;

    // Validate required fields
    if (!employeeId || employeeId === null || employeeId === undefined) {
      return NextResponse.json({ 
        error: "Employee ID is required",
        code: "MISSING_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    if (!month || month === null || month === undefined) {
      return NextResponse.json({ 
        error: "Month is required",
        code: "MISSING_MONTH" 
      }, { status: 400 });
    }

    if (!year || year === null || year === undefined) {
      return NextResponse.json({ 
        error: "Year is required",
        code: "MISSING_YEAR" 
      }, { status: 400 });
    }

    if (basicSalary === null || basicSalary === undefined) {
      return NextResponse.json({ 
        error: "Basic salary is required",
        code: "MISSING_BASIC_SALARY" 
      }, { status: 400 });
    }

    if (allowances === null || allowances === undefined) {
      return NextResponse.json({ 
        error: "Allowances is required",
        code: "MISSING_ALLOWANCES" 
      }, { status: 400 });
    }

    if (deductions === null || deductions === undefined) {
      return NextResponse.json({ 
        error: "Deductions is required",
        code: "MISSING_DEDUCTIONS" 
      }, { status: 400 });
    }

    if (grossSalary === null || grossSalary === undefined) {
      return NextResponse.json({ 
        error: "Gross salary is required",
        code: "MISSING_GROSS_SALARY" 
      }, { status: 400 });
    }

    if (netSalary === null || netSalary === undefined) {
      return NextResponse.json({ 
        error: "Net salary is required",
        code: "MISSING_NET_SALARY" 
      }, { status: 400 });
    }

    if (pfAmount === null || pfAmount === undefined) {
      return NextResponse.json({ 
        error: "PF amount is required",
        code: "MISSING_PF_AMOUNT" 
      }, { status: 400 });
    }

    if (esicAmount === null || esicAmount === undefined) {
      return NextResponse.json({ 
        error: "ESIC amount is required",
        code: "MISSING_ESIC_AMOUNT" 
      }, { status: 400 });
    }

    if (tdsAmount === null || tdsAmount === undefined) {
      return NextResponse.json({ 
        error: "TDS amount is required",
        code: "MISSING_TDS_AMOUNT" 
      }, { status: 400 });
    }

    // Validate month range
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ 
        error: "Month must be between 1 and 12",
        code: "INVALID_MONTH" 
      }, { status: 400 });
    }

    // Validate year range
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json({ 
        error: "Year must be between 2000 and 2100",
        code: "INVALID_YEAR" 
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

    // Validate monetary values are non-negative
    const monetaryFields = [
      { value: basicSalary, name: 'Basic salary' },
      { value: allowances, name: 'Allowances' },
      { value: deductions, name: 'Deductions' },
      { value: grossSalary, name: 'Gross salary' },
      { value: netSalary, name: 'Net salary' },
      { value: pfAmount, name: 'PF amount' },
      { value: esicAmount, name: 'ESIC amount' },
      { value: tdsAmount, name: 'TDS amount' }
    ];

    for (const field of monetaryFields) {
      const numValue = parseFloat(field.value);
      if (isNaN(numValue) || numValue < 0) {
        return NextResponse.json({ 
          error: `${field.name} must be a non-negative number`,
          code: "INVALID_MONETARY_VALUE" 
        }, { status: 400 });
      }
    }

    // Validate status if provided
    const finalStatus = status || 'draft';
    if (!['draft', 'processed', 'paid'].includes(finalStatus)) {
      return NextResponse.json({ 
        error: "Status must be one of: draft, processed, paid",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newPayroll = await db.insert(payroll)
      .values({
        employeeId: parseInt(employeeId),
        month: monthNum,
        year: yearNum,
        basicSalary: parseFloat(basicSalary),
        allowances: parseFloat(allowances),
        deductions: parseFloat(deductions),
        grossSalary: parseFloat(grossSalary),
        netSalary: parseFloat(netSalary),
        pfAmount: parseFloat(pfAmount),
        esicAmount: parseFloat(esicAmount),
        tdsAmount: parseFloat(tdsAmount),
        status: finalStatus,
        paymentDate: paymentDate || null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newPayroll[0], { status: 201 });

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

    const body = await request.json();

    // Security check: reject if userId or similar fields provided
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const {
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      pfAmount,
      esicAmount,
      tdsAmount,
      status,
      paymentDate
    } = body;

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add monetary fields if provided
    const monetaryFields = [
      { key: 'basicSalary', value: basicSalary, name: 'Basic salary' },
      { key: 'allowances', value: allowances, name: 'Allowances' },
      { key: 'deductions', value: deductions, name: 'Deductions' },
      { key: 'grossSalary', value: grossSalary, name: 'Gross salary' },
      { key: 'netSalary', value: netSalary, name: 'Net salary' },
      { key: 'pfAmount', value: pfAmount, name: 'PF amount' },
      { key: 'esicAmount', value: esicAmount, name: 'ESIC amount' },
      { key: 'tdsAmount', value: tdsAmount, name: 'TDS amount' }
    ];

    for (const field of monetaryFields) {
      if (field.value !== undefined && field.value !== null) {
        const numValue = parseFloat(field.value);
        if (isNaN(numValue) || numValue < 0) {
          return NextResponse.json({ 
            error: `${field.name} must be a non-negative number`,
            code: "INVALID_MONETARY_VALUE" 
          }, { status: 400 });
        }
        updates[field.key] = numValue;
      }
    }

    // Validate and add status if provided
    if (status !== undefined && status !== null) {
      if (!['draft', 'processed', 'paid'].includes(status)) {
        return NextResponse.json({ 
          error: "Status must be one of: draft, processed, paid",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = status;
    }

    // Add paymentDate if provided
    if (paymentDate !== undefined) {
      updates.paymentDate = paymentDate;
    }

    const updated = await db.update(payroll)
      .set(updates)
      .where(eq(payroll.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });

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

    // Check if record exists
    const existing = await db.select()
      .from(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const deleted = await db.delete(payroll)
      .where(eq(payroll.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Payroll record deleted successfully',
      deleted: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}