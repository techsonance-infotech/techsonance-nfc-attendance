import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
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

    const invoice = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, parseInt(id)), eq(invoices.createdBy, user.id)))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice[0]);
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

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const {
      clientName,
      clientEmail,
      clientAddress,
      issueDate,
      dueDate,
      status,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      notes,
    } = body;

    if (status && !['draft', 'sent', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status. Must be one of: draft, sent, paid, overdue',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    if (clientEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
    }

    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, parseInt(id)), eq(invoices.createdBy, user.id)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (clientName !== undefined) updates.clientName = clientName.trim();
    if (clientEmail !== undefined) updates.clientEmail = clientEmail.toLowerCase().trim();
    if (clientAddress !== undefined) updates.clientAddress = clientAddress?.trim();
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) updates.status = status;
    if (subtotal !== undefined) updates.subtotal = subtotal;
    if (taxRate !== undefined) updates.taxRate = taxRate;
    if (taxAmount !== undefined) updates.taxAmount = taxAmount;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount;
    if (notes !== undefined) updates.notes = notes?.trim();

    const updated = await db
      .update(invoices)
      .set(updates)
      .where(and(eq(invoices.id, parseInt(id)), eq(invoices.createdBy, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
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

    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, parseInt(id)), eq(invoices.createdBy, user.id)))
      .limit(1);

    if (existingInvoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(invoices)
      .where(and(eq(invoices.id, parseInt(id)), eq(invoices.createdBy, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Invoice deleted successfully',
      invoice: deleted[0],
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}