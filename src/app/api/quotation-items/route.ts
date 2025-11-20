import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotationItems, quotations } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const quotationId = searchParams.get('quotation_id');

    // If ID is provided, fetch single record
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'Quotation item not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // For list queries, quotation_id is REQUIRED
    if (!quotationId) {
      return NextResponse.json(
        { 
          error: 'quotation_id is required for listing quotation items', 
          code: 'MISSING_QUOTATION_ID' 
        },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(quotationId))) {
      return NextResponse.json(
        { error: 'Valid quotation_id is required', code: 'INVALID_QUOTATION_ID' },
        { status: 400 }
      );
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Fetch records for the specified quotation, ordered by createdAt ASC
    const records = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, parseInt(quotationId)))
      .orderBy(asc(quotationItems.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(records, { status: 200 });
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
    const { quotationId, description, quantity, unitPrice, total } = body;

    // Validate required fields
    if (!quotationId) {
      return NextResponse.json(
        { error: 'quotationId is required', code: 'MISSING_QUOTATION_ID' },
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

    if (total === undefined || total === null) {
      return NextResponse.json(
        { error: 'total is required', code: 'MISSING_TOTAL' },
        { status: 400 }
      );
    }

    // Validate quantity is positive
    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity must be positive', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    // Validate unitPrice is non-negative
    if (unitPrice < 0) {
      return NextResponse.json(
        { error: 'unitPrice must be non-negative', code: 'INVALID_UNIT_PRICE' },
        { status: 400 }
      );
    }

    // Validate total is non-negative
    if (total < 0) {
      return NextResponse.json(
        { error: 'total must be non-negative', code: 'INVALID_TOTAL' },
        { status: 400 }
      );
    }

    // Verify quotationId exists in quotations table
    const quotationExists = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, quotationId))
      .limit(1);

    if (quotationExists.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found', code: 'QUOTATION_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create new quotation item
    const newItem = await db
      .insert(quotationItems)
      .values({
        quotationId,
        description: description.trim(),
        quantity,
        unitPrice,
        total,
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Quotation item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { description, quantity, unitPrice, total } = body;

    // Validate quantity if provided
    if (quantity !== undefined && quantity !== null && quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity must be positive', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    // Validate unitPrice if provided
    if (unitPrice !== undefined && unitPrice !== null && unitPrice < 0) {
      return NextResponse.json(
        { error: 'unitPrice must be non-negative', code: 'INVALID_UNIT_PRICE' },
        { status: 400 }
      );
    }

    // Validate total if provided
    if (total !== undefined && total !== null && total < 0) {
      return NextResponse.json(
        { error: 'total must be non-negative', code: 'INVALID_TOTAL' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    
    if (description !== undefined) {
      updates.description = description.trim();
    }
    if (quantity !== undefined && quantity !== null) {
      updates.quantity = quantity;
    }
    if (unitPrice !== undefined && unitPrice !== null) {
      updates.unitPrice = unitPrice;
    }
    if (total !== undefined && total !== null) {
      updates.total = total;
    }

    // Perform update
    const updated = await db
      .update(quotationItems)
      .set(updates)
      .where(eq(quotationItems.id, parseInt(id)))
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Quotation item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the record
    const deleted = await db
      .delete(quotationItems)
      .where(eq(quotationItems.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Quotation item deleted successfully',
        deleted: deleted[0],
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