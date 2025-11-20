import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid values for enums
const VALID_STATUSES = ['active', 'inactive', 'on_hold'];
const VALID_COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(clients)
        .where(eq(clients.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Client not found',
          code: 'CLIENT_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const industry = searchParams.get('industry');
    const assignedAccountManager = searchParams.get('assigned_account_manager');

    let query = db.select().from(clients);
    const conditions = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(clients.name, `%${search}%`),
          like(clients.email, `%${search}%`)
        )
      );
    }

    // Status filter
    if (status) {
      conditions.push(eq(clients.status, status));
    }

    // Industry filter
    if (industry) {
      conditions.push(eq(clients.industry, industry));
    }

    // Assigned account manager filter
    if (assignedAccountManager) {
      const managerId = parseInt(assignedAccountManager);
      if (!isNaN(managerId)) {
        conditions.push(eq(clients.assignedAccountManager, managerId));
      }
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt DESC and apply pagination
    const results = await query
      .orderBy(desc(clients.createdAt))
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
    const body = await request.json();

    // Required fields validation
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!body.email || !body.email.trim()) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!body.status || !body.status.trim()) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    // Email format validation
    if (!EMAIL_REGEX.test(body.email.trim())) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Status validation
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Company size validation if provided
    if (body.companySize && !VALID_COMPANY_SIZES.includes(body.companySize)) {
      return NextResponse.json({ 
        error: `Company size must be one of: ${VALID_COMPANY_SIZES.join(', ')}`,
        code: "INVALID_COMPANY_SIZE" 
      }, { status: 400 });
    }

    // Prepare data for insertion
    const now = new Date().toISOString();
    const insertData: any = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      status: body.status,
      createdAt: now,
      updatedAt: now,
    };

    // Optional fields
    if (body.phone !== undefined && body.phone !== null) {
      insertData.phone = body.phone.trim() || null;
    }
    if (body.address !== undefined && body.address !== null) {
      insertData.address = body.address.trim() || null;
    }
    if (body.industry !== undefined && body.industry !== null) {
      insertData.industry = body.industry.trim() || null;
    }
    if (body.companySize !== undefined && body.companySize !== null) {
      insertData.companySize = body.companySize;
    }
    if (body.annualRevenue !== undefined && body.annualRevenue !== null) {
      insertData.annualRevenue = parseInt(body.annualRevenue);
    }
    if (body.website !== undefined && body.website !== null) {
      insertData.website = body.website.trim() || null;
    }
    if (body.assignedAccountManager !== undefined && body.assignedAccountManager !== null) {
      insertData.assignedAccountManager = parseInt(body.assignedAccountManager) || null;
    }
    if (body.leadId !== undefined && body.leadId !== null) {
      insertData.leadId = parseInt(body.leadId) || null;
    }

    const newClient = await db.insert(clients)
      .values(insertData)
      .returning();

    return NextResponse.json(newClient[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const clientId = parseInt(id);

    // Check if record exists
    const existingRecord = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();

    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate company size if provided
    if (body.companySize && !VALID_COMPANY_SIZES.includes(body.companySize)) {
      return NextResponse.json({ 
        error: `Company size must be one of: ${VALID_COMPANY_SIZES.join(', ')}`,
        code: "INVALID_COMPANY_SIZE" 
      }, { status: 400 });
    }

    // Validate email format if provided
    if (body.email && !EMAIL_REGEX.test(body.email.trim())) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Only update provided fields
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.email !== undefined) {
      updateData.email = body.email.trim().toLowerCase();
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? body.phone.trim() : null;
    }
    if (body.address !== undefined) {
      updateData.address = body.address ? body.address.trim() : null;
    }
    if (body.industry !== undefined) {
      updateData.industry = body.industry ? body.industry.trim() : null;
    }
    if (body.companySize !== undefined) {
      updateData.companySize = body.companySize || null;
    }
    if (body.annualRevenue !== undefined) {
      updateData.annualRevenue = body.annualRevenue ? parseInt(body.annualRevenue) : null;
    }
    if (body.website !== undefined) {
      updateData.website = body.website ? body.website.trim() : null;
    }
    if (body.assignedAccountManager !== undefined) {
      updateData.assignedAccountManager = body.assignedAccountManager ? parseInt(body.assignedAccountManager) : null;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.leadId !== undefined) {
      updateData.leadId = body.leadId ? parseInt(body.leadId) : null;
    }

    const updated = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();

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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const clientId = parseInt(id);

    // Check if record exists
    const existingRecord = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(clients)
      .where(eq(clients.id, clientId))
      .returning();

    return NextResponse.json({
      message: 'Client deleted successfully',
      client: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}