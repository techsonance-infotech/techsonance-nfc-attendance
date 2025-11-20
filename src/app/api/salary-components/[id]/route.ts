import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryComponents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const component = await db
      .select()
      .from(salaryComponents)
      .where(eq(salaryComponents.id, parseInt(id)))
      .limit(1);

    if (component.length === 0) {
      return NextResponse.json(
        { error: 'Salary component not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(component[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Security check: reject if userId, user_id, or authorId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Check if component exists
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
    if (
      body.componentType &&
      !['allowance', 'deduction'].includes(body.componentType)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid component type. Must be allowance or deduction',
          code: 'INVALID_COMPONENT_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate amount is non-negative if provided
    if (body.amount !== undefined && body.amount < 0) {
      return NextResponse.json(
        {
          error: 'Amount must be non-negative',
          code: 'INVALID_AMOUNT',
        },
        { status: 400 }
      );
    }

    // Validate percentageValue is non-negative if provided
    if (body.percentageValue !== undefined && body.percentageValue < 0) {
      return NextResponse.json(
        {
          error: 'Percentage value must be non-negative',
          code: 'INVALID_PERCENTAGE_VALUE',
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.componentName !== undefined) {
      updates.componentName = body.componentName.trim();
    }
    if (body.componentType !== undefined) {
      updates.componentType = body.componentType;
    }
    if (body.amount !== undefined) {
      updates.amount = body.amount;
    }
    if (body.isPercentage !== undefined) {
      updates.isPercentage = body.isPercentage;
    }
    if (body.percentageValue !== undefined) {
      updates.percentageValue = body.percentageValue;
    }
    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }

    const updated = await db
      .update(salaryComponents)
      .set(updates)
      .where(eq(salaryComponents.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update salary component', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if component exists
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

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete salary component', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Salary component deleted successfully',
        deletedComponent: deleted[0],
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