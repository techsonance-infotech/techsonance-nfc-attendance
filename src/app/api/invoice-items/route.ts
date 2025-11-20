import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoiceItems, invoices } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const invoiceId = searchParams.get('invoice_id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'Invoice item not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with required invoice_id filter
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoice_id parameter is required', code: 'MISSING_INVOICE_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(invoiceId))) {
      return NextResponse.json(
        { error: 'Valid invoice_id is required', code: 'INVALID_INVOICE_ID' },
        { status: 400 }
      );
    }

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const results = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, parseInt(invoiceId)))
      .orderBy(desc(invoiceItems.createdAt))
      .limit(limit)
      .offset(offset);

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
    const { invoiceId, description, quantity, unitPrice, amount } = body;

    // Validate required fields
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required', code: 'MISSING_INVOICE_ID' },
        { status: 400 }
      );
    }

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'quantity is required', code: 'MISSING_QUANTITY' },
        { status: 400 }
      );
    }

    if (unitPrice === undefined || unitPrice === null) {
      return NextResponse.json(
        { error: 'unitPrice is required', code: 'MISSING_UNIT_PRICE' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate invoiceId is a valid number
    if (isNaN(parseInt(invoiceId.toString()))) {
      return NextResponse.json(
        { error: 'invoiceId must be a valid number', code: 'INVALID_INVOICE_ID' },
        { status: 400 }
      );
    }

    // Validate positive numbers
    const quantityNum = parseFloat(quantity.toString());
    const unitPriceNum = parseFloat(unitPrice.toString());
    const amountNum = parseFloat(amount.toString());

    if (isNaN(quantityNum) || quantityNum <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive number', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
      return NextResponse.json(
        { error: 'unitPrice must be a positive number', code: 'INVALID_UNIT_PRICE' },
        { status: 400 }
      );
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate invoiceId exists in invoices table
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parseInt(invoiceId.toString())))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create invoice item
    const newItem = await db
      .insert(invoiceItems)
      .values({
        invoiceId: parseInt(invoiceId.toString()),
        description: description.trim(),
        quantity: quantityNum,
        unitPrice: unitPriceNum,
        amount: amountNum,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newItem[0], { status: 201 });
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

    // Build update object with only provided fields
    const updates: any = {};

    if (description !== undefined) {
      if (description.trim() === '') {
        return NextResponse.json(
          { error: 'description cannot be empty', code: 'INVALID_DESCRIPTION' },
          { status: 400 }
        );
      }
      updates.description = description.trim();
    }

    if (quantity !== undefined) {
      const quantityNum = parseFloat(quantity.toString());
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return NextResponse.json(
          { error: 'quantity must be a positive number', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
      updates.quantity = quantityNum;
    }

    if (unitPrice !== undefined) {
      const unitPriceNum = parseFloat(unitPrice.toString());
      if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
        return NextResponse.json(
          { error: 'unitPrice must be a positive number', code: 'INVALID_UNIT_PRICE' },
          { status: 400 }
        );
      }
      updates.unitPrice = unitPriceNum;
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount.toString());
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          { error: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
          { status: 400 }
        );
      }
      updates.amount = amountNum;
    }

    // If no fields to update, return the existing record
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing[0], { status: 200 });
    }

    // Update the record
    const updated = await db
      .update(invoiceItems)
      .set(updates)
      .where(eq(invoiceItems.id, parseInt(id)))
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
      .from(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Invoice item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the record
    const deleted = await db
      .delete(invoiceItems)
      .where(eq(invoiceItems.id, parseInt(id)))
      .returning();

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