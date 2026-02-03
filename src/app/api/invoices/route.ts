import { NextRequest, NextResponse } from 'next/server';
// Force rebuild
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq, like, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Helper function to generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${year}-${month}-${timestamp}`;
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate status
function isValidStatus(status: string): boolean {
  return ['draft', 'sent', 'paid', 'overdue'].includes(status);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({
          error: "Valid ID is required",
          code: "INVALID_ID"
        }, { status: 400 });
      }

      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, parseInt(id)))
        .limit(1);

      if (invoice.length === 0) {
        return NextResponse.json({
          error: 'Invoice not found',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json(invoice[0], { status: 200 });
    }

    // List with pagination and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');
    const clientName = searchParams.get('client_name');

    let query = db.select().from(invoices);
    const conditions = [];

    // Add status filter
    if (status) {
      if (!isValidStatus(status)) {
        return NextResponse.json({
          error: "Invalid status. Must be one of: draft, sent, paid, overdue",
          code: "INVALID_STATUS"
        }, { status: 400 });
      }
      conditions.push(eq(invoices.status, status));
    }

    // Add client name search filter
    if (clientName) {
      conditions.push(like(invoices.clientName, `%${clientName}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
      notes
    } = body;

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // User ID from session
    const createdBy = user.id;

    // Validate required fields
    if (!clientName) {
      return NextResponse.json({
        error: "Client name is required",
        code: "MISSING_CLIENT_NAME"
      }, { status: 400 });
    }

    if (!clientEmail) {
      return NextResponse.json({
        error: "Client email is required",
        code: "MISSING_CLIENT_EMAIL"
      }, { status: 400 });
    }

    if (!isValidEmail(clientEmail)) {
      return NextResponse.json({
        error: "Invalid email format",
        code: "INVALID_EMAIL"
      }, { status: 400 });
    }

    if (!issueDate) {
      return NextResponse.json({
        error: "Issue date is required",
        code: "MISSING_ISSUE_DATE"
      }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({
        error: "Due date is required",
        code: "MISSING_DUE_DATE"
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({
        error: "Status is required",
        code: "MISSING_STATUS"
      }, { status: 400 });
    }

    if (!isValidStatus(status)) {
      return NextResponse.json({
        error: "Invalid status. Must be one of: draft, sent, paid, overdue",
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    if (subtotal === undefined || subtotal === null) {
      return NextResponse.json({
        error: "Subtotal is required",
        code: "MISSING_SUBTOTAL"
      }, { status: 400 });
    }

    if (taxRate === undefined || taxRate === null) {
      return NextResponse.json({
        error: "Tax rate is required",
        code: "MISSING_TAX_RATE"
      }, { status: 400 });
    }

    if (taxAmount === undefined || taxAmount === null) {
      return NextResponse.json({
        error: "Tax amount is required",
        code: "MISSING_TAX_AMOUNT"
      }, { status: 400 });
    }

    if (totalAmount === undefined || totalAmount === null) {
      return NextResponse.json({
        error: "Total amount is required",
        code: "MISSING_TOTAL_AMOUNT"
      }, { status: 400 });
    }

    // Removed explicit body check for createdBy since it comes from session

    // Validate numeric fields are positive
    if (subtotal < 0) {
      return NextResponse.json({
        error: "Subtotal must be a positive number",
        code: "INVALID_SUBTOTAL"
      }, { status: 400 });
    }

    if (taxRate < 0) {
      return NextResponse.json({
        error: "Tax rate must be a positive number",
        code: "INVALID_TAX_RATE"
      }, { status: 400 });
    }

    if (taxAmount < 0) {
      return NextResponse.json({
        error: "Tax amount must be a positive number",
        code: "INVALID_TAX_AMOUNT"
      }, { status: 400 });
    }

    if (totalAmount < 0) {
      return NextResponse.json({
        error: "Total amount must be a positive number",
        code: "INVALID_TOTAL_AMOUNT"
      }, { status: 400 });
    }

    // Generate invoice number and timestamps
    const invoiceNumber = generateInvoiceNumber();
    const timestamp = new Date().toISOString();

    // Insert new invoice
    const newInvoice = await db.insert(invoices)
      .values({
        invoiceNumber,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientAddress: clientAddress?.trim() || null,
        issueDate,
        dueDate,
        status,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        notes: notes?.trim() || null,
        createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    return NextResponse.json(newInvoice[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if createdBy provided in body
    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json({
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED"
      }, { status: 400 });
    }

    // Check if invoice exists and belongs to user
    const existing = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.id, parseInt(id)),
        eq(invoices.createdBy, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
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
      notes
    } = body;

    // Validate email format if provided
    if (clientEmail && !isValidEmail(clientEmail)) {
      return NextResponse.json({
        error: "Invalid email format",
        code: "INVALID_EMAIL"
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !isValidStatus(status)) {
      return NextResponse.json({
        error: "Invalid status. Must be one of: draft, sent, paid, overdue",
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    // Validate numeric fields if provided
    if (subtotal !== undefined && subtotal < 0) {
      return NextResponse.json({
        error: "Subtotal must be a positive number",
        code: "INVALID_SUBTOTAL"
      }, { status: 400 });
    }

    if (taxRate !== undefined && taxRate < 0) {
      return NextResponse.json({
        error: "Tax rate must be a positive number",
        code: "INVALID_TAX_RATE"
      }, { status: 400 });
    }

    if (taxAmount !== undefined && taxAmount < 0) {
      return NextResponse.json({
        error: "Tax amount must be a positive number",
        code: "INVALID_TAX_AMOUNT"
      }, { status: 400 });
    }

    if (totalAmount !== undefined && totalAmount < 0) {
      return NextResponse.json({
        error: "Total amount must be a positive number",
        code: "INVALID_TOTAL_AMOUNT"
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (clientName !== undefined) updates.clientName = clientName.trim();
    if (clientEmail !== undefined) updates.clientEmail = clientEmail.trim().toLowerCase();
    if (clientAddress !== undefined) updates.clientAddress = clientAddress?.trim() || null;
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) updates.status = status;
    if (subtotal !== undefined) updates.subtotal = subtotal;
    if (taxRate !== undefined) updates.taxRate = taxRate;
    if (taxAmount !== undefined) updates.taxAmount = taxAmount;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    // Update invoice
    const updated = await db.update(invoices)
      .set(updates)
      .where(and(
        eq(invoices.id, parseInt(id)),
        eq(invoices.createdBy, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    // Check if invoice exists and belongs to user
    const existing = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.id, parseInt(id)),
        eq(invoices.createdBy, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    // Delete invoice
    const deleted = await db.delete(invoices)
      .where(and(
        eq(invoices.id, parseInt(id)),
        eq(invoices.createdBy, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Invoice deleted successfully',
      invoice: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}