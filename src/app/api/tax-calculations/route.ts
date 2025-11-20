import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taxCalculations, employees } from '@/db/schema';
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

    // Single record fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(taxCalculations)
        .where(eq(taxCalculations.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Tax calculation not found' }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with pagination and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const financialYear = searchParams.get('financial_year');
    const employeeId = searchParams.get('employee_id');

    let query = db.select().from(taxCalculations);

    // Apply filters
    const conditions = [];
    if (financialYear) {
      conditions.push(eq(taxCalculations.financialYear, financialYear));
    }
    if (employeeId && !isNaN(parseInt(employeeId))) {
      conditions.push(eq(taxCalculations.employeeId, parseInt(employeeId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sort by calculatedAt desc
    const results = await query
      .orderBy(desc(taxCalculations.calculatedAt))
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
    const { financialYear, employeeId, grossIncome, deductions, taxableIncome, taxAmount } = body;

    // Validate required fields
    if (!financialYear) {
      return NextResponse.json({ 
        error: "Financial year is required",
        code: "MISSING_FINANCIAL_YEAR" 
      }, { status: 400 });
    }

    if (!employeeId) {
      return NextResponse.json({ 
        error: "Employee ID is required",
        code: "MISSING_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    if (grossIncome === undefined || grossIncome === null) {
      return NextResponse.json({ 
        error: "Gross income is required",
        code: "MISSING_GROSS_INCOME" 
      }, { status: 400 });
    }

    if (deductions === undefined || deductions === null) {
      return NextResponse.json({ 
        error: "Deductions is required",
        code: "MISSING_DEDUCTIONS" 
      }, { status: 400 });
    }

    if (taxableIncome === undefined || taxableIncome === null) {
      return NextResponse.json({ 
        error: "Taxable income is required",
        code: "MISSING_TAXABLE_INCOME" 
      }, { status: 400 });
    }

    if (taxAmount === undefined || taxAmount === null) {
      return NextResponse.json({ 
        error: "Tax amount is required",
        code: "MISSING_TAX_AMOUNT" 
      }, { status: 400 });
    }

    // Validate employee exists
    const employee = await db.select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ 
        error: "Employee not found",
        code: "EMPLOYEE_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate monetary values are non-negative
    if (grossIncome < 0) {
      return NextResponse.json({ 
        error: "Gross income cannot be negative",
        code: "INVALID_GROSS_INCOME" 
      }, { status: 400 });
    }

    if (deductions < 0) {
      return NextResponse.json({ 
        error: "Deductions cannot be negative",
        code: "INVALID_DEDUCTIONS" 
      }, { status: 400 });
    }

    if (taxableIncome < 0) {
      return NextResponse.json({ 
        error: "Taxable income cannot be negative",
        code: "INVALID_TAXABLE_INCOME" 
      }, { status: 400 });
    }

    if (taxAmount < 0) {
      return NextResponse.json({ 
        error: "Tax amount cannot be negative",
        code: "INVALID_TAX_AMOUNT" 
      }, { status: 400 });
    }

    // Validate taxableIncome = grossIncome - deductions
    const calculatedTaxableIncome = grossIncome - deductions;
    const tolerance = 0.01; // Allow small floating point differences
    if (Math.abs(taxableIncome - calculatedTaxableIncome) > tolerance) {
      return NextResponse.json({ 
        error: "Taxable income must equal gross income minus deductions",
        code: "INVALID_TAXABLE_INCOME_CALCULATION" 
      }, { status: 400 });
    }

    // Create tax calculation
    const newTaxCalculation = await db.insert(taxCalculations)
      .values({
        financialYear: financialYear.trim(),
        employeeId,
        grossIncome,
        deductions,
        taxableIncome,
        taxAmount,
        calculatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newTaxCalculation[0], { status: 201 });
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

    // Check if record exists
    const existingRecord = await db.select()
      .from(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Tax calculation not found' }, { status: 404 });
    }

    const body = await request.json();
    const { grossIncome, deductions, taxableIncome, taxAmount } = body;

    const updates: any = {};

    // Validate and add updates
    if (grossIncome !== undefined) {
      if (grossIncome < 0) {
        return NextResponse.json({ 
          error: "Gross income cannot be negative",
          code: "INVALID_GROSS_INCOME" 
        }, { status: 400 });
      }
      updates.grossIncome = grossIncome;
    }

    if (deductions !== undefined) {
      if (deductions < 0) {
        return NextResponse.json({ 
          error: "Deductions cannot be negative",
          code: "INVALID_DEDUCTIONS" 
        }, { status: 400 });
      }
      updates.deductions = deductions;
    }

    if (taxableIncome !== undefined) {
      if (taxableIncome < 0) {
        return NextResponse.json({ 
          error: "Taxable income cannot be negative",
          code: "INVALID_TAXABLE_INCOME" 
        }, { status: 400 });
      }
      updates.taxableIncome = taxableIncome;
    }

    if (taxAmount !== undefined) {
      if (taxAmount < 0) {
        return NextResponse.json({ 
          error: "Tax amount cannot be negative",
          code: "INVALID_TAX_AMOUNT" 
        }, { status: 400 });
      }
      updates.taxAmount = taxAmount;
    }

    // Validate taxableIncome calculation if both grossIncome and deductions are being updated
    const finalGrossIncome = updates.grossIncome !== undefined ? updates.grossIncome : existingRecord[0].grossIncome;
    const finalDeductions = updates.deductions !== undefined ? updates.deductions : existingRecord[0].deductions;
    const finalTaxableIncome = updates.taxableIncome !== undefined ? updates.taxableIncome : existingRecord[0].taxableIncome;

    const calculatedTaxableIncome = finalGrossIncome - finalDeductions;
    const tolerance = 0.01;
    if (Math.abs(finalTaxableIncome - calculatedTaxableIncome) > tolerance) {
      return NextResponse.json({ 
        error: "Taxable income must equal gross income minus deductions",
        code: "INVALID_TAXABLE_INCOME_CALCULATION" 
      }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existingRecord[0], { status: 200 });
    }

    const updated = await db.update(taxCalculations)
      .set(updates)
      .where(eq(taxCalculations.id, parseInt(id)))
      .returning();

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
    const existingRecord = await db.select()
      .from(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Tax calculation not found' }, { status: 404 });
    }

    const deleted = await db.delete(taxCalculations)
      .where(eq(taxCalculations.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Tax calculation deleted successfully',
      deleted: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}