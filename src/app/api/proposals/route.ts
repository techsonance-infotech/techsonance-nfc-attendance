import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { proposals } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function generateProposalNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `PROP-${year}-${month}-${timestamp}`;
}

const VALID_STATUSES = ['draft', 'sent', 'under_review', 'accepted', 'rejected'] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('client_id');
    const leadId = searchParams.get('lead_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record fetch
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(proposals)
        .where(and(
          eq(proposals.id, parseInt(id)),
          eq(proposals.createdBy, parseInt(user.id))
        ))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Proposal not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with filters
    const conditions = [eq(proposals.createdBy, parseInt(user.id))];

    if (clientId) {
      if (!isNaN(parseInt(clientId))) {
        conditions.push(eq(proposals.clientId, parseInt(clientId)));
      }
    }

    if (leadId) {
      if (!isNaN(parseInt(leadId))) {
        conditions.push(eq(proposals.leadId, parseInt(leadId)));
      }
    }

    if (status) {
      conditions.push(eq(proposals.status, status));
    }

    if (search) {
      const searchCondition = or(
        like(proposals.title, `%${search}%`),
        like(proposals.proposalNumber, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const results = await db.select()
      .from(proposals)
      .where(and(...conditions))
      .orderBy(desc(proposals.createdAt))
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if createdBy provided in body
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
      objective,
      scopeOfWork,
      deliverables,
      timeline,
      pricing,
      status,
      templateId,
      pdfUrl,
      sentAt,
      reviewedAt,
      acceptedAt,
      rejectedAt,
      rejectionReason
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        error: 'Title is required and must be a non-empty string',
        code: 'MISSING_TITLE' 
      }, { status: 400 });
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ 
        error: 'Status is required',
        code: 'MISSING_STATUS' 
      }, { status: 400 });
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    // At least one of clientId or leadId must be provided
    if (!clientId && !leadId) {
      return NextResponse.json({ 
        error: 'Either clientId or leadId must be provided',
        code: 'MISSING_CLIENT_OR_LEAD' 
      }, { status: 400 });
    }

    // Validate pricing if provided
    if (pricing !== null && pricing !== undefined) {
      if (typeof pricing !== 'number' || pricing < 0) {
        return NextResponse.json({ 
          error: 'Pricing must be a non-negative number',
          code: 'INVALID_PRICING' 
        }, { status: 400 });
      }
    }

    // Validate clientId if provided
    if (clientId !== null && clientId !== undefined) {
      if (typeof clientId !== 'number' || isNaN(clientId)) {
        return NextResponse.json({ 
          error: 'ClientId must be a valid number',
          code: 'INVALID_CLIENT_ID' 
        }, { status: 400 });
      }
    }

    // Validate leadId if provided
    if (leadId !== null && leadId !== undefined) {
      if (typeof leadId !== 'number' || isNaN(leadId)) {
        return NextResponse.json({ 
          error: 'LeadId must be a valid number',
          code: 'INVALID_LEAD_ID' 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const proposalNumber = generateProposalNumber();

    const insertData = {
      proposalNumber,
      clientId: clientId ?? null,
      leadId: leadId ?? null,
      title: title.trim(),
      description: description?.trim() ?? null,
      objective: objective?.trim() ?? null,
      scopeOfWork: scopeOfWork?.trim() ?? null,
      deliverables: deliverables?.trim() ?? null,
      timeline: timeline?.trim() ?? null,
      pricing: pricing ?? null,
      status,
      templateId: templateId?.trim() ?? null,
      pdfUrl: pdfUrl?.trim() ?? null,
      createdBy: parseInt(user.id),
      sentAt: sentAt ?? null,
      reviewedAt: reviewedAt ?? null,
      acceptedAt: acceptedAt ?? null,
      rejectedAt: rejectedAt ?? null,
      rejectionReason: rejectionReason?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const newProposal = await db.insert(proposals)
      .values(insertData)
      .returning();

    return NextResponse.json(newProposal[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: 'A proposal with this number already exists',
        code: 'DUPLICATE_PROPOSAL_NUMBER' 
      }, { status: 400 });
    }

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
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

    // Check if record exists and belongs to user
    const existing = await db.select()
      .from(proposals)
      .where(and(
        eq(proposals.id, parseInt(id)),
        eq(proposals.createdBy, parseInt(user.id))
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Proposal not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const {
      clientId,
      leadId,
      title,
      description,
      objective,
      scopeOfWork,
      deliverables,
      timeline,
      pricing,
      status,
      templateId,
      pdfUrl,
      sentAt,
      reviewedAt,
      acceptedAt,
      rejectedAt,
      rejectionReason
    } = body;

    // Validate status if provided
    if (status !== undefined && status !== null) {
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json({ 
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
    }

    // Validate pricing if provided
    if (pricing !== undefined && pricing !== null) {
      if (typeof pricing !== 'number' || pricing < 0) {
        return NextResponse.json({ 
          error: 'Pricing must be a non-negative number',
          code: 'INVALID_PRICING' 
        }, { status: 400 });
      }
    }

    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return NextResponse.json({ 
        error: 'Title must be a non-empty string',
        code: 'INVALID_TITLE' 
      }, { status: 400 });
    }

    // Validate clientId if provided
    if (clientId !== undefined && clientId !== null) {
      if (typeof clientId !== 'number' || isNaN(clientId)) {
        return NextResponse.json({ 
          error: 'ClientId must be a valid number',
          code: 'INVALID_CLIENT_ID' 
        }, { status: 400 });
      }
    }

    // Validate leadId if provided
    if (leadId !== undefined && leadId !== null) {
      if (typeof leadId !== 'number' || isNaN(leadId)) {
        return NextResponse.json({ 
          error: 'LeadId must be a valid number',
          code: 'INVALID_LEAD_ID' 
        }, { status: 400 });
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (clientId !== undefined) updates.clientId = clientId;
    if (leadId !== undefined) updates.leadId = leadId;
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() ?? null;
    if (objective !== undefined) updates.objective = objective?.trim() ?? null;
    if (scopeOfWork !== undefined) updates.scopeOfWork = scopeOfWork?.trim() ?? null;
    if (deliverables !== undefined) updates.deliverables = deliverables?.trim() ?? null;
    if (timeline !== undefined) updates.timeline = timeline?.trim() ?? null;
    if (pricing !== undefined) updates.pricing = pricing;
    if (status !== undefined) updates.status = status;
    if (templateId !== undefined) updates.templateId = templateId?.trim() ?? null;
    if (pdfUrl !== undefined) updates.pdfUrl = pdfUrl?.trim() ?? null;
    if (sentAt !== undefined) updates.sentAt = sentAt;
    if (reviewedAt !== undefined) updates.reviewedAt = reviewedAt;
    if (acceptedAt !== undefined) updates.acceptedAt = acceptedAt;
    if (rejectedAt !== undefined) updates.rejectedAt = rejectedAt;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason?.trim() ?? null;

    const updated = await db.update(proposals)
      .set(updates)
      .where(and(
        eq(proposals.id, parseInt(id)),
        eq(proposals.createdBy, parseInt(user.id))
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Proposal not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: 'A proposal with this number already exists',
        code: 'DUPLICATE_PROPOSAL_NUMBER' 
      }, { status: 400 });
    }

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existing = await db.select()
      .from(proposals)
      .where(and(
        eq(proposals.id, parseInt(id)),
        eq(proposals.createdBy, parseInt(user.id))
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Proposal not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(proposals)
      .where(and(
        eq(proposals.id, parseInt(id)),
        eq(proposals.createdBy, parseInt(user.id))
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Proposal not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Proposal deleted successfully',
      deleted: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}