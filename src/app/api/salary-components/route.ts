import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryComponents, employees } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const employeeId = searchParams.get('employee_id');
    const componentType = searchParams.get('component_type');
    const isActiveParam = searchParams.get('is_active');

    // Single record by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(salaryComponents)
        .where(eq(salaryComponents.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'Salary component not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List query - employee_id is required
    if (!employeeId) {
      return NextResponse.json(
        { error: 'employee_id parameter is required', code: 'MISSING_EMPLOYEE_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(employeeId))) {
      return NextResponse.json(
        { error: 'Valid employee_id is required', code: 'INVALID_EMPLOYEE_ID' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(salaryComponents.employeeId, parseInt(employeeId))];

    if (componentType) {
      if (componentType !== 'allowance' && componentType !== 'deduction') {
        return NextResponse.json(
          { error: 'component_type must be either allowance or deduction', code: 'INVALID_COMPONENT_TYPE' },
          { status: 400 }
        );
      }
      conditions.push(eq(salaryComponents.componentType, componentType));
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(salaryComponents.isActive, isActive));
    }

    const results = await db
      .select()
      .from(salaryComponents)
      .where(and(...conditions))
      .orderBy(asc(salaryComponents.componentName));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      componentName,
      componentType,
      amount,
      isPercentage,
      percentageValue,
      isActive,
    } = body;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId is required', code: 'MISSING_EMPLOYEE_ID' },
        { status: 400 }
      );
    }

    if (!componentName || componentName.trim() === '') {
      return NextResponse.json(
        { error: 'componentName is required', code: 'MISSING_COMPONENT_NAME' },
        { status: 400 }
      );
    }

    if (!componentType) {
      return NextResponse.json(
        { error: 'componentType is required', code: 'MISSING_COMPONENT_TYPE' },
        { status: 400 }
      );
    }

    if (componentType !== 'allowance' && componentType !== 'deduction') {
      return NextResponse.json(
        { error: 'componentType must be either allowance or deduction', code: 'INVALID_COMPONENT_TYPE' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: 'amount must be non-negative', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    if (typeof isPercentage !== 'boolean') {
      return NextResponse.json(
        { error: 'isPercentage is required and must be a boolean', code: 'MISSING_IS_PERCENTAGE' },
        { status: 400 }
      );
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive is required and must be a boolean', code: 'MISSING_IS_ACTIVE' },
        { status: 400 }
      );
    }

    // Validate percentageValue if isPercentage is true
    if (isPercentage) {
      if (percentageValue === undefined || percentageValue === null) {
        return NextResponse.json(
          { error: 'percentageValue is required when isPercentage is true', code: 'MISSING_PERCENTAGE_VALUE' },
          { status: 400 }
        );
      }

      if (percentageValue < 0 || percentageValue > 100) {
        return NextResponse.json(
          { error: 'percentageValue must be between 0 and 100', code: 'INVALID_PERCENTAGE_VALUE' },
          { status: 400 }
        );
      }
    }

    // Verify employee exists
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newComponent = await db
      .insert(salaryComponents)
      .values({
        employeeId,
        componentName: componentName.trim(),
        componentType,
        amount,
        isPercentage,
        percentageValue: isPercentage ? percentageValue : null,
        isActive,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newComponent[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      componentName,
      componentType,
      amount,
      isPercentage,
      percentageValue,
      isActive,
    } = body;

    // Check if record exists
    const existing = await db
      .select()
      .from(salaryComponents)
      .where(eq(salaryComponents.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Salary component not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate componentType if provided
    if (componentType && componentType !== 'allowance' && componentType !== 'deduction') {
      return NextResponse.json(
        { error: 'componentType must be either allowance or deduction', code: 'INVALID_COMPONENT_TYPE' },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (amount !== undefined && amount !== null && amount < 0) {
      return NextResponse.json(
        { error: 'amount must be non-negative', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate percentageValue if isPercentage is true
    const finalIsPercentage = isPercentage !== undefined ? isPercentage : existing[0].isPercentage;
    if (finalIsPercentage && percentageValue !== undefined && percentageValue !== null) {
      if (percentageValue < 0 || percentageValue > 100) {
        return NextResponse.json(
          { error: 'percentageValue must be between 0 and 100', code: 'INVALID_PERCENTAGE_VALUE' },
          { status: 400 }
        );
      }
    }

    if (finalIsPercentage && isPercentage !== undefined && percentageValue === undefined && existing[0].percentageValue === null) {
      return NextResponse.json(
        { error: 'percentageValue is required when isPercentage is true', code: 'MISSING_PERCENTAGE_VALUE' },
        { status: 400 }
      );
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (componentName !== undefined) {
      if (componentName.trim() === '') {
        return NextResponse.json(
          { error: 'componentName cannot be empty', code: 'INVALID_COMPONENT_NAME' },
          { status: 400 }
        );
      }
      updates.componentName = componentName.trim();
    }

    if (componentType !== undefined) {
      updates.componentType = componentType;
    }

    if (amount !== undefined && amount !== null) {
      updates.amount = amount;
    }

    if (isPercentage !== undefined) {
      updates.isPercentage = isPercentage;
      if (!isPercentage) {
        updates.percentageValue = null;
      }
    }

    if (percentageValue !== undefined) {
      updates.percentageValue = percentageValue;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const updated = await db
      .update(salaryComponents)
      .set(updates)
      .where(eq(salaryComponents.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(salaryComponents)
      .where(eq(salaryComponents.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Salary component not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(salaryComponents)
      .where(eq(salaryComponents.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Salary component deleted successfully',
        deletedRecord: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}