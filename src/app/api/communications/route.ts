import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { communications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_TYPES = ['email', 'phone', 'meeting', 'chat'] as const;

function isValidType(type: string): type is typeof VALID_TYPES[number] {
  return VALID_TYPES.includes(type as any);
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
}

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
    const type = searchParams.get('type');
    const userId = searchParams.get('user_id');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(communications)
        .where(and(
          eq(communications.id, parseInt(id)),
          eq(communications.userId, user.id)
        ))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Communication record not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with filters
    const conditions = [eq(communications.userId, user.id)];

    if (clientId) {
      const parsedClientId = parseInt(clientId);
      if (!isNaN(parsedClientId)) {
        conditions.push(eq(communications.clientId, parsedClientId));
      }
    }

    if (leadId) {
      const parsedLeadId = parseInt(leadId);
      if (!isNaN(parsedLeadId)) {
        conditions.push(eq(communications.leadId, parsedLeadId));
      }
    }

    if (type) {
      if (isValidType(type)) {
        conditions.push(eq(communications.type, type));
      }
    }

    if (userId) {
      const parsedUserId = userId;
      conditions.push(eq(communications.userId, parsedUserId));
    }

    const results = await db.select()
      .from(communications)
      .where(and(...conditions))
      .orderBy(desc(communications.communicationDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

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

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED' 
      }, { status: 400 });
    }

    const { type, notes, communicationDate, clientId, leadId, subject } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json({ 
        error: 'Type is required',
        code: 'MISSING_TYPE' 
      }, { status: 400 });
    }

    if (!notes) {
      return NextResponse.json({ 
        error: 'Notes are required',
        code: 'MISSING_NOTES' 
      }, { status: 400 });
    }

    if (!communicationDate) {
      return NextResponse.json({ 
        error: 'Communication date is required',
        code: 'MISSING_COMMUNICATION_DATE' 
      }, { status: 400 });
    }

    // Validate at least one of clientId or leadId is provided
    if (!clientId && !leadId) {
      return NextResponse.json({ 
        error: 'At least one of clientId or leadId must be provided',
        code: 'MISSING_CLIENT_OR_LEAD' 
      }, { status: 400 });
    }

    // Validate type
    if (!isValidType(type)) {
      return NextResponse.json({ 
        error: 'Type must be one of: email, phone, meeting, chat',
        code: 'INVALID_TYPE' 
      }, { status: 400 });
    }

    // Validate communicationDate is valid ISO timestamp
    if (!isValidISODate(communicationDate)) {
      return NextResponse.json({ 
        error: 'Communication date must be a valid ISO timestamp',
        code: 'INVALID_COMMUNICATION_DATE' 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData: any = {
      type: type.trim(),
      notes: notes.trim(),
      communicationDate,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    if (clientId) {
      insertData.clientId = parseInt(clientId);
    }

    if (leadId) {
      insertData.leadId = parseInt(leadId);
    }

    if (subject) {
      insertData.subject = subject.trim();
    }

    const newRecord = await db.insert(communications)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
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
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED' 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existing = await db.select()
      .from(communications)
      .where(and(
        eq(communications.id, parseInt(id)),
        eq(communications.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Communication record not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const { type, notes, communicationDate, clientId, leadId, subject } = body;

    // Validate type if provided
    if (type !== undefined && !isValidType(type)) {
      return NextResponse.json({ 
        error: 'Type must be one of: email, phone, meeting, chat',
        code: 'INVALID_TYPE' 
      }, { status: 400 });
    }

    // Validate communicationDate if provided
    if (communicationDate !== undefined && !isValidISODate(communicationDate)) {
      return NextResponse.json({ 
        error: 'Communication date must be a valid ISO timestamp',
        code: 'INVALID_COMMUNICATION_DATE' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (type !== undefined) {
      updateData.type = type.trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes.trim();
    }

    if (communicationDate !== undefined) {
      updateData.communicationDate = communicationDate;
    }

    if (clientId !== undefined) {
      updateData.clientId = clientId ? parseInt(clientId) : null;
    }

    if (leadId !== undefined) {
      updateData.leadId = leadId ? parseInt(leadId) : null;
    }

    if (subject !== undefined) {
      updateData.subject = subject ? subject.trim() : null;
    }

    const updated = await db.update(communications)
      .set(updateData)
      .where(and(
        eq(communications.id, parseInt(id)),
        eq(communications.userId, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Communication record not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });

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
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existing = await db.select()
      .from(communications)
      .where(and(
        eq(communications.id, parseInt(id)),
        eq(communications.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Communication record not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(communications)
      .where(and(
        eq(communications.id, parseInt(id)),
        eq(communications.userId, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Communication record not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Communication record deleted successfully',
      deletedRecord: deleted[0] 
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}