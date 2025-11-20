import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotationItems } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  try {
    const { quotationId } = params;

    // Validate quotationId is a valid integer
    if (!quotationId || isNaN(parseInt(quotationId))) {
      return NextResponse.json(
        {
          error: 'Valid quotation ID is required',
          code: 'INVALID_QUOTATION_ID',
        },
        { status: 400 }
      );
    }

    const parsedQuotationId = parseInt(quotationId);

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query quotation items filtered by quotationId
    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, parsedQuotationId))
      .orderBy(asc(quotationItems.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('GET quotation items error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}