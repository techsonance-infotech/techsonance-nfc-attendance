import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, invoices } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, parseInt(id)))
        .limit(1);

      if (payment.length === 0) {
        return NextResponse.json(
          { error: 'Payment not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(payment[0], { status: 200 });
    }

    // List with pagination and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const invoiceId = searchParams.get('invoice_id');
    const paymentMethod = searchParams.get('payment_method');

    let query = db.select().from(payments);

    // Build filter conditions
    const conditions = [];
    if (invoiceId) {
      conditions.push(eq(payments.invoiceId, parseInt(invoiceId)));
    }
    if (paymentMethod) {
      conditions.push(eq(payments.paymentMethod, paymentMethod));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(payments.paymentDate))
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
    const { invoiceId, paymentDate, amount, paymentMethod, transactionId, notes } = body;

    // Validate required fields
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required', code: 'MISSING_INVOICE_ID' },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'Payment date is required', code: 'MISSING_PAYMENT_DATE' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required', code: 'MISSING_PAYMENT_METHOD' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate paymentDate is valid date
    const dateCheck = new Date(paymentDate);
    if (isNaN(dateCheck.getTime())) {
      return NextResponse.json(
        { error: 'Payment date must be a valid date', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Validate invoiceId exists in invoices table
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parseInt(invoiceId)))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create payment
    const newPayment = await db
      .insert(payments)
      .values({
        invoiceId: parseInt(invoiceId),
        paymentDate,
        amount,
        paymentMethod,
        transactionId: transactionId || null,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newPayment[0], { status: 201 });
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

    // Check if payment exists
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { paymentDate, amount, paymentMethod, transactionId, notes } = body;

    // Build update object with only provided fields
    const updates: any = {};

    if (paymentDate !== undefined) {
      const dateCheck = new Date(paymentDate);
      if (isNaN(dateCheck.getTime())) {
        return NextResponse.json(
          { error: 'Payment date must be a valid date', code: 'INVALID_DATE' },
          { status: 400 }
        );
      }
      updates.paymentDate = paymentDate;
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
          { status: 400 }
        );
      }
      updates.amount = amount;
    }

    if (paymentMethod !== undefined) {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method cannot be empty', code: 'INVALID_PAYMENT_METHOD' },
          { status: 400 }
        );
      }
      updates.paymentMethod = paymentMethod;
    }

    if (transactionId !== undefined) {
      updates.transactionId = transactionId || null;
    }

    if (notes !== undefined) {
      updates.notes = notes || null;
    }

    // Perform update
    const updated = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, parseInt(id)))
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

    // Check if payment exists
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete payment
    const deleted = await db
      .delete(payments)
      .where(eq(payments.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Payment deleted successfully',
        payment: deleted[0],
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