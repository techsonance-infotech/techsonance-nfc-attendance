import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts, clients } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const contract = await db.select()
        .from(contracts)
        .where(eq(contracts.id, parseInt(id)))
        .limit(1);

      if (contract.length === 0) {
        return NextResponse.json({ 
          error: 'Contract not found',
          code: "NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(contract[0]);
    }

    // List with filters
    let query = db.select().from(contracts);
    const conditions = [];

    // Filter by client_id
    if (clientId) {
      const parsedClientId = parseInt(clientId);
      if (!isNaN(parsedClientId)) {
        conditions.push(eq(contracts.clientId, parsedClientId));
      }
    }

    // Filter by status
    if (status) {
      conditions.push(eq(contracts.status, status));
    }

    // Search in title and contractNumber
    if (search) {
      conditions.push(
        or(
          like(contracts.title, `%${search}%`),
          like(contracts.contractNumber, `%${search}%`)
        )
      );
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt DESC and apply pagination
    const results = await query
      .orderBy(desc(contracts.createdAt))
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
    const body = await request.json();
    const { 
      clientId, 
      contractNumber, 
      title, 
      description,
      value, 
      startDate, 
      endDate, 
      status,
      documentUrl,
      signedBy,
      signedAt
    } = body;

    // Validate required fields
    if (!clientId) {
      return NextResponse.json({ 
        error: "clientId is required",
        code: "MISSING_CLIENT_ID" 
      }, { status: 400 });
    }

    if (!contractNumber) {
      return NextResponse.json({ 
        error: "contractNumber is required",
        code: "MISSING_CONTRACT_NUMBER" 
      }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ 
        error: "title is required",
        code: "MISSING_TITLE" 
      }, { status: 400 });
    }

    if (!value) {
      return NextResponse.json({ 
        error: "value is required",
        code: "MISSING_VALUE" 
      }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ 
        error: "startDate is required",
        code: "MISSING_START_DATE" 
      }, { status: 400 });
    }

    if (!endDate) {
      return NextResponse.json({ 
        error: "endDate is required",
        code: "MISSING_END_DATE" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['draft', 'active', 'expired', 'terminated'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "status must be one of: draft, active, expired, terminated",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate value is positive
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      return NextResponse.json({ 
        error: "value must be a positive number",
        code: "INVALID_VALUE" 
      }, { status: 400 });
    }

    // Validate dates are valid ISO strings
    if (isNaN(Date.parse(startDate))) {
      return NextResponse.json({ 
        error: "startDate must be a valid ISO date",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    if (isNaN(Date.parse(endDate))) {
      return NextResponse.json({ 
        error: "endDate must be a valid ISO date",
        code: "INVALID_END_DATE" 
      }, { status: 400 });
    }

    // Validate clientId exists
    const clientExists = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(clientId)))
      .limit(1);

    if (clientExists.length === 0) {
      return NextResponse.json({ 
        error: "Client does not exist",
        code: "CLIENT_NOT_FOUND" 
      }, { status: 400 });
    }

    // Check contractNumber uniqueness
    const existingContract = await db.select()
      .from(contracts)
      .where(eq(contracts.contractNumber, contractNumber.trim()))
      .limit(1);

    if (existingContract.length > 0) {
      return NextResponse.json({ 
        error: "Contract number already exists",
        code: "DUPLICATE_CONTRACT_NUMBER" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Insert new contract
    const newContract = await db.insert(contracts)
      .values({
        clientId: parseInt(clientId),
        contractNumber: contractNumber.trim(),
        title: title.trim(),
        description: description?.trim() || null,
        value: parsedValue,
        startDate,
        endDate,
        status,
        documentUrl: documentUrl?.trim() || null,
        signedBy: signedBy?.trim() || null,
        signedAt: signedAt || null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newContract[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if ((error as Error).message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: "Contract number already exists",
        code: "DUPLICATE_CONTRACT_NUMBER" 
      }, { status: 400 });
    }
    
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

    const body = await request.json();
    const {
      clientId,
      contractNumber,
      title,
      description,
      value,
      startDate,
      endDate,
      status,
      documentUrl,
      signedBy,
      signedAt
    } = body;

    // Check if contract exists
    const existing = await db.select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Contract not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'active', 'expired', 'terminated'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "status must be one of: draft, active, expired, terminated",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }

    // Validate value if provided
    if (value !== undefined) {
      const parsedValue = parseInt(value);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        return NextResponse.json({ 
          error: "value must be a positive number",
          code: "INVALID_VALUE" 
        }, { status: 400 });
      }
    }

    // Validate dates if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json({ 
        error: "startDate must be a valid ISO date",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json({ 
        error: "endDate must be a valid ISO date",
        code: "INVALID_END_DATE" 
      }, { status: 400 });
    }

    // Validate clientId if provided
    if (clientId) {
      const clientExists = await db.select()
        .from(clients)
        .where(eq(clients.id, parseInt(clientId)))
        .limit(1);

      if (clientExists.length === 0) {
        return NextResponse.json({ 
          error: "Client does not exist",
          code: "CLIENT_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Check contractNumber uniqueness if provided
    if (contractNumber) {
      const existingContract = await db.select()
        .from(contracts)
        .where(eq(contracts.contractNumber, contractNumber.trim()))
        .limit(1);

      if (existingContract.length > 0 && existingContract[0].id !== parseInt(id)) {
        return NextResponse.json({ 
          error: "Contract number already exists",
          code: "DUPLICATE_CONTRACT_NUMBER" 
        }, { status: 400 });
      }
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (clientId !== undefined) updates.clientId = parseInt(clientId);
    if (contractNumber !== undefined) updates.contractNumber = contractNumber.trim();
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (value !== undefined) updates.value = parseInt(value);
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (status !== undefined) updates.status = status;
    if (documentUrl !== undefined) updates.documentUrl = documentUrl?.trim() || null;
    if (signedBy !== undefined) updates.signedBy = signedBy?.trim() || null;
    if (signedAt !== undefined) updates.signedAt = signedAt || null;

    const updated = await db.update(contracts)
      .set(updates)
      .where(eq(contracts.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    
    // Handle unique constraint violation
    if ((error as Error).message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: "Contract number already exists",
        code: "DUPLICATE_CONTRACT_NUMBER" 
      }, { status: 400 });
    }
    
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

    // Check if contract exists
    const existing = await db.select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Contract not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Contract deleted successfully',
      contract: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}