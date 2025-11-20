import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid stage values
const VALID_STAGES = ['new', 'contacted', 'proposal', 'won', 'lost'] as const;

// Valid priority values
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const stage = searchParams.get('stage');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assigned_to');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record fetch by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const lead = await db.select()
        .from(leads)
        .where(eq(leads.id, parseInt(id)))
        .limit(1);

      if (lead.length === 0) {
        return NextResponse.json({ 
          error: 'Lead not found',
          code: 'LEAD_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(lead[0], { status: 200 });
    }

    // List with filters
    let query = db.select().from(leads);
    const conditions = [];

    // Filter by stage
    if (stage) {
      if (!VALID_STAGES.includes(stage as any)) {
        return NextResponse.json({ 
          error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
          code: 'INVALID_STAGE' 
        }, { status: 400 });
      }
      conditions.push(eq(leads.stage, stage));
    }

    // Filter by priority
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority as any)) {
        return NextResponse.json({ 
          error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
          code: 'INVALID_PRIORITY' 
        }, { status: 400 });
      }
      conditions.push(eq(leads.priority, priority));
    }

    // Filter by assigned user
    if (assignedTo) {
      if (isNaN(parseInt(assignedTo))) {
        return NextResponse.json({ 
          error: "Valid assigned_to user ID is required",
          code: "INVALID_ASSIGNED_TO" 
        }, { status: 400 });
      }
      conditions.push(eq(leads.assignedTo, parseInt(assignedTo)));
    }

    // Search in name and email
    if (search) {
      const searchCondition = or(
        like(leads.name, `%${search}%`),
        like(leads.email, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt DESC
    const results = await query
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
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

    // Security check: reject if userId or assignedTo provided inappropriately
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      name, 
      email, 
      phone, 
      source, 
      stage, 
      value, 
      assignedTo,
      priority, 
      notes, 
      nextFollowUp,
      wonAt,
      lostReason
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!stage || !stage.trim()) {
      return NextResponse.json({ 
        error: "Stage is required",
        code: "MISSING_STAGE" 
      }, { status: 400 });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Validate stage
    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ 
        error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
        code: 'INVALID_STAGE' 
      }, { status: 400 });
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ 
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        code: 'INVALID_PRIORITY' 
      }, { status: 400 });
    }

    // Validate assignedTo if provided
    if (assignedTo !== undefined && assignedTo !== null && isNaN(parseInt(assignedTo))) {
      return NextResponse.json({ 
        error: "Invalid assignedTo user ID",
        code: "INVALID_ASSIGNED_TO" 
      }, { status: 400 });
    }

    // Validate value if provided
    if (value !== undefined && value !== null && isNaN(parseInt(value))) {
      return NextResponse.json({ 
        error: "Invalid value amount",
        code: "INVALID_VALUE" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Prepare insert data
    const insertData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      stage,
      createdAt: now,
      updatedAt: now,
    };

    // Add optional fields if provided
    if (phone) insertData.phone = phone.trim();
    if (source) insertData.source = source.trim();
    if (value !== undefined && value !== null) insertData.value = parseInt(value);
    if (assignedTo !== undefined && assignedTo !== null) insertData.assignedTo = parseInt(assignedTo);
    if (priority) insertData.priority = priority;
    if (notes) insertData.notes = notes.trim();
    if (nextFollowUp) insertData.nextFollowUp = nextFollowUp;
    if (wonAt) insertData.wonAt = wonAt;
    if (lostReason) insertData.lostReason = lostReason.trim();

    const newLead = await db.insert(leads)
      .values(insertData)
      .returning();

    return NextResponse.json(newLead[0], { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
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
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if lead exists
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.id, parseInt(id)))
      .limit(1);

    if (existingLead.length === 0) {
      return NextResponse.json({ 
        error: 'Lead not found',
        code: 'LEAD_NOT_FOUND' 
      }, { status: 404 });
    }

    const { 
      name, 
      email, 
      phone, 
      source, 
      stage, 
      value, 
      assignedTo,
      priority, 
      notes, 
      nextFollowUp,
      wonAt,
      lostReason
    } = body;

    // Validate email format if provided
    if (email && !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Validate stage if provided
    if (stage && !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ 
        error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
        code: 'INVALID_STAGE' 
      }, { status: 400 });
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ 
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        code: 'INVALID_PRIORITY' 
      }, { status: 400 });
    }

    // Validate assignedTo if provided
    if (assignedTo !== undefined && assignedTo !== null && isNaN(parseInt(assignedTo))) {
      return NextResponse.json({ 
        error: "Invalid assignedTo user ID",
        code: "INVALID_ASSIGNED_TO" 
      }, { status: 400 });
    }

    // Validate value if provided
    if (value !== undefined && value !== null && isNaN(parseInt(value))) {
      return NextResponse.json({ 
        error: "Invalid value amount",
        code: "INVALID_VALUE" 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    // Add fields to update only if provided
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (source !== undefined) updateData.source = source ? source.trim() : null;
    if (stage !== undefined) updateData.stage = stage;
    if (value !== undefined) updateData.value = value !== null ? parseInt(value) : null;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo !== null ? parseInt(assignedTo) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (nextFollowUp !== undefined) updateData.nextFollowUp = nextFollowUp;
    if (wonAt !== undefined) updateData.wonAt = wonAt;
    if (lostReason !== undefined) updateData.lostReason = lostReason ? lostReason.trim() : null;

    const updated = await db.update(leads)
      .set(updateData)
      .where(eq(leads.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
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
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if lead exists
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.id, parseInt(id)))
      .limit(1);

    if (existingLead.length === 0) {
      return NextResponse.json({ 
        error: 'Lead not found',
        code: 'LEAD_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(leads)
      .where(eq(leads.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Lead deleted successfully',
      lead: deleted[0]
    }, { status: 200 });

  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}