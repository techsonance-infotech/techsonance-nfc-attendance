import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { slas } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate pagination parameters
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({
        error: 'Invalid limit parameter',
        code: 'INVALID_LIMIT'
      }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({
        error: 'Invalid offset parameter',
        code: 'INVALID_OFFSET'
      }, { status: 400 });
    }

    // Query breached SLAs with pagination and sorting
    const breachedSlas = await db.select()
      .from(slas)
      .where(eq(slas.status, 'breached'))
      .orderBy(desc(slas.lastMeasuredAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(breachedSlas, { status: 200 });

  } catch (error) {
    console.error('GET breached SLAs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}