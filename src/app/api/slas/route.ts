import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { slas } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_STATUSES = ['met', 'at_risk', 'breached'];
const VALID_MEASUREMENT_PERIODS = ['daily', 'weekly', 'monthly'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const measurementPeriod = searchParams.get('measurement_period');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record fetch by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      const record = await db.select()
        .from(slas)
        .where(eq(slas.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({
          error: 'SLA not found',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filters
    let query = db.select().from(slas);
    const conditions = [];

    if (clientId) {
      if (isNaN(parseInt(clientId))) {
        return NextResponse.json({
          error: 'Valid client_id is required',
          code: 'INVALID_CLIENT_ID'
        }, { status: 400 });
      }
      conditions.push(eq(slas.clientId, parseInt(clientId)));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(slas.status, status));
    }

    if (measurementPeriod) {
      if (!VALID_MEASUREMENT_PERIODS.includes(measurementPeriod)) {
        return NextResponse.json({
          error: `Measurement period must be one of: ${VALID_MEASUREMENT_PERIODS.join(', ')}`,
          code: 'INVALID_MEASUREMENT_PERIOD'
        }, { status: 400 });
      }
      conditions.push(eq(slas.measurementPeriod, measurementPeriod));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(slas.createdAt))
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
      contractId, 
      metricName, 
      targetValue, 
      currentValue,
      status, 
      measurementPeriod,
      lastMeasuredAt
    } = body;

    // Validate required fields
    if (!clientId) {
      return NextResponse.json({
        error: 'clientId is required',
        code: 'MISSING_CLIENT_ID'
      }, { status: 400 });
    }

    if (isNaN(parseInt(clientId.toString()))) {
      return NextResponse.json({
        error: 'Valid clientId is required',
        code: 'INVALID_CLIENT_ID'
      }, { status: 400 });
    }

    if (!metricName || !metricName.trim()) {
      return NextResponse.json({
        error: 'metricName is required',
        code: 'MISSING_METRIC_NAME'
      }, { status: 400 });
    }

    if (!targetValue || !targetValue.trim()) {
      return NextResponse.json({
        error: 'targetValue is required',
        code: 'MISSING_TARGET_VALUE'
      }, { status: 400 });
    }

    if (!status || !status.trim()) {
      return NextResponse.json({
        error: 'status is required',
        code: 'MISSING_STATUS'
      }, { status: 400 });
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Validate measurement period if provided
    if (measurementPeriod && !VALID_MEASUREMENT_PERIODS.includes(measurementPeriod)) {
      return NextResponse.json({
        error: `Measurement period must be one of: ${VALID_MEASUREMENT_PERIODS.join(', ')}`,
        code: 'INVALID_MEASUREMENT_PERIOD'
      }, { status: 400 });
    }

    // Validate contractId if provided
    if (contractId !== null && contractId !== undefined && isNaN(parseInt(contractId.toString()))) {
      return NextResponse.json({
        error: 'Valid contractId is required',
        code: 'INVALID_CONTRACT_ID'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newSla = await db.insert(slas).values({
      clientId: parseInt(clientId.toString()),
      contractId: contractId ? parseInt(contractId.toString()) : null,
      metricName: metricName.trim(),
      targetValue: targetValue.trim(),
      currentValue: currentValue ? currentValue.trim() : null,
      status: status.trim(),
      measurementPeriod: measurementPeriod ? measurementPeriod.trim() : null,
      lastMeasuredAt: lastMeasuredAt || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newSla[0], { status: 201 });
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
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(slas)
      .where(eq(slas.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'SLA not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const body = await request.json();
    const { 
      clientId, 
      contractId, 
      metricName, 
      targetValue, 
      currentValue,
      status, 
      measurementPeriod,
      lastMeasuredAt
    } = body;

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (clientId !== undefined) {
      if (isNaN(parseInt(clientId.toString()))) {
        return NextResponse.json({
          error: 'Valid clientId is required',
          code: 'INVALID_CLIENT_ID'
        }, { status: 400 });
      }
      updates.clientId = parseInt(clientId.toString());
    }

    if (contractId !== undefined) {
      if (contractId !== null && isNaN(parseInt(contractId.toString()))) {
        return NextResponse.json({
          error: 'Valid contractId is required',
          code: 'INVALID_CONTRACT_ID'
        }, { status: 400 });
      }
      updates.contractId = contractId ? parseInt(contractId.toString()) : null;
    }

    if (metricName !== undefined) {
      if (!metricName.trim()) {
        return NextResponse.json({
          error: 'metricName cannot be empty',
          code: 'INVALID_METRIC_NAME'
        }, { status: 400 });
      }
      updates.metricName = metricName.trim();
    }

    if (targetValue !== undefined) {
      if (!targetValue.trim()) {
        return NextResponse.json({
          error: 'targetValue cannot be empty',
          code: 'INVALID_TARGET_VALUE'
        }, { status: 400 });
      }
      updates.targetValue = targetValue.trim();
    }

    if (currentValue !== undefined) {
      updates.currentValue = currentValue ? currentValue.trim() : null;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = status.trim();
    }

    if (measurementPeriod !== undefined) {
      if (measurementPeriod !== null && !VALID_MEASUREMENT_PERIODS.includes(measurementPeriod)) {
        return NextResponse.json({
          error: `Measurement period must be one of: ${VALID_MEASUREMENT_PERIODS.join(', ')}`,
          code: 'INVALID_MEASUREMENT_PERIOD'
        }, { status: 400 });
      }
      updates.measurementPeriod = measurementPeriod ? measurementPeriod.trim() : null;
    }

    if (lastMeasuredAt !== undefined) {
      updates.lastMeasuredAt = lastMeasuredAt;
    }

    const updated = await db.update(slas)
      .set(updates)
      .where(eq(slas.id, parseInt(id)))
      .returning();

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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(slas)
      .where(eq(slas.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'SLA not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const deleted = await db.delete(slas)
      .where(eq(slas.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'SLA deleted successfully',
      deleted: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}