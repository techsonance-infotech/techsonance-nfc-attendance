import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoiceItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const item = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .limit(1);

    if (item.length === 0) {
      return NextResponse.json(
        { error: 'Invoice item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(item[0], { status: 200 });
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
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, quantity, unitPrice, amount } = body;

    // Check if record exists
    const existing = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Invoice item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate positive numbers if provided
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity <= 0) {
        return NextResponse.json(
          {
            error: 'Quantity must be a positive number',
            code: 'INVALID_QUANTITY',
          },
          { status: 400 }
        );
      }
    }

    if (unitPrice !== undefined) {
      if (typeof unitPrice !== 'number' || unitPrice <= 0) {
        return NextResponse.json(
          {
            error: 'Unit price must be a positive number',
            code: 'INVALID_UNIT_PRICE',
          },
          { status: 400 }
        );
      }
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          {
            error: 'Amount must be a positive number',
            code: 'INVALID_AMOUNT',
          },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updates: {
      description?: string;
      quantity?: number;
      unitPrice?: number;
      amount?: number;
    } = {};

    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : description;
    }
    if (quantity !== undefined) {
      updates.quantity = quantity;
    }
    if (unitPrice !== undefined) {
      updates.unitPrice = unitPrice;
    }
    if (amount !== undefined) {
      updates.amount = amount;
    }

    const updated = await db
      .update(invoiceItems)
      .set(updates)
      .where(eq(invoiceItems.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update invoice item', code: 'UPDATE_FAILED' },
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
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Invoice item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete invoice item', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Invoice item deleted successfully',
        deletedItem: deleted[0],
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