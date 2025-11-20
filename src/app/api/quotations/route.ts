import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function generateQuotationNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `QUO-${year}-${month}-${timestamp}`;
}

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const clientId = searchParams.get('client_id');
    const leadId = searchParams.get('lead_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(quotations)
        .where(and(
          eq(quotations.id, parseInt(id)),
          eq(quotations.createdBy, user.id)
        ))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    let conditions = [eq(quotations.createdBy, user.id)];

    if (clientId) {
      conditions.push(eq(quotations.clientId, parseInt(clientId)));
    }

    if (leadId) {
      conditions.push(eq(quotations.leadId, parseInt(leadId)));
    }

    if (status) {
      conditions.push(eq(quotations.status, status));
    }

    if (search) {
      const searchCondition = or(
        like(quotations.title, `%${search}%`),
        like(quotations.quotationNumber, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const results = await db.select()
      .from(quotations)
      .where(and(...conditions))
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
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

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      clientId,
      leadId,
      title,
      description,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      validUntil,
      status,
      notes,
      termsConditions
    } = body;

    if (!title) {
      return NextResponse.json({ 
        error: "Title is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (subtotal === undefined || subtotal === null) {
      return NextResponse.json({ 
        error: "Subtotal is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (taxRate === undefined || taxRate === null) {
      return NextResponse.json({ 
        error: "Tax rate is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (taxAmount === undefined || taxAmount === null) {
      return NextResponse.json({ 
        error: "Tax amount is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (totalAmount === undefined || totalAmount === null) {
      return NextResponse.json({ 
        error: "Total amount is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!validUntil) {
      return NextResponse.json({ 
        error: "Valid until date is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!clientId && !leadId) {
      return NextResponse.json({ 
        error: "Either clientId or leadId must be provided",
        code: "MISSING_CLIENT_OR_LEAD" 
      }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (subtotal < 0 || taxAmount < 0 || totalAmount < 0) {
      return NextResponse.json({ 
        error: "Monetary values cannot be negative",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    const quotationNumber = generateQuotationNumber();
    const now = new Date().toISOString();

    const newQuotation = await db.insert(quotations)
      .values({
        quotationNumber,
        clientId: clientId || null,
        leadId: leadId || null,
        title: title.trim(),
        description: description?.trim() || null,
        subtotal,
        taxRate: taxRate || 18.0,
        taxAmount,
        totalAmount,
        validUntil,
        status,
        notes: notes?.trim() || null,
        termsConditions: termsConditions?.trim() || null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        acceptedAt: null,
        rejectedReason: null
      })
      .returning();

    return NextResponse.json(newQuotation[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: 'A quotation with this number already exists',
        code: "DUPLICATE_QUOTATION_NUMBER" 
      }, { status: 400 });
    }

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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    if ('createdBy' in body || 'created_by' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(quotations)
      .where(and(
        eq(quotations.id, parseInt(id)),
        eq(quotations.createdBy, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (
      (body.subtotal !== undefined && body.subtotal < 0) ||
      (body.taxAmount !== undefined && body.taxAmount < 0) ||
      (body.totalAmount !== undefined && body.totalAmount < 0)
    ) {
      return NextResponse.json({ 
        error: "Monetary values cannot be negative",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (body.clientId !== undefined) updates.clientId = body.clientId;
    if (body.leadId !== undefined) updates.leadId = body.leadId;
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.subtotal !== undefined) updates.subtotal = body.subtotal;
    if (body.taxRate !== undefined) updates.taxRate = body.taxRate;
    if (body.taxAmount !== undefined) updates.taxAmount = body.taxAmount;
    if (body.totalAmount !== undefined) updates.totalAmount = body.totalAmount;
    if (body.validUntil !== undefined) updates.validUntil = body.validUntil;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.termsConditions !== undefined) updates.termsConditions = body.termsConditions?.trim() || null;
    if (body.acceptedAt !== undefined) updates.acceptedAt = body.acceptedAt;
    if (body.rejectedReason !== undefined) updates.rejectedReason = body.rejectedReason?.trim() || null;

    const updated = await db.update(quotations)
      .set(updates)
      .where(and(
        eq(quotations.id, parseInt(id)),
        eq(quotations.createdBy, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(quotations)
      .where(and(
        eq(quotations.id, parseInt(id)),
        eq(quotations.createdBy, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const deleted = await db.delete(quotations)
      .where(and(
        eq(quotations.id, parseInt(id)),
        eq(quotations.createdBy, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Quotation deleted successfully',
      deleted: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}