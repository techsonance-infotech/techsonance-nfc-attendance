import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const payment = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);

    if (payment.length === 0) {
      return NextResponse.json(
        { 
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(payment[0], { status: 200 });
  } catch (error) {
    console.error('GET payment error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
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
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { paymentDate, amount, paymentMethod, transactionId, notes } = body;

    // Validate amount if provided
    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { 
            error: 'Amount must be a positive number',
            code: 'INVALID_AMOUNT'
          },
          { status: 400 }
        );
      }
    }

    // Check if payment exists
    const existingPayment = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json(
        { 
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};

    if (paymentDate !== undefined) updates.paymentDate = paymentDate;
    if (amount !== undefined) updates.amount = amount;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (transactionId !== undefined) updates.transactionId = transactionId;
    if (notes !== undefined) updates.notes = notes;

    // If no fields to update, return current payment
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existingPayment[0], { status: 200 });
    }

    const updated = await db.update(payments)
      .set(updates)
      .where(eq(payments.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update payment',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT payment error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
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
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Check if payment exists
    const existingPayment = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json(
        { 
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const deleted = await db.delete(payments)
      .where(eq(payments.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to delete payment',
          code: 'DELETE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Payment deleted successfully',
        payment: deleted[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE payment error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}