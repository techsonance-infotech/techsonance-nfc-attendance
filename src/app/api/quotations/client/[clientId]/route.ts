import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    // Validate clientId is a valid integer
    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json(
        { 
          error: "Valid clientId is required",
          code: "INVALID_CLIENT_ID" 
        },
        { status: 400 }
      );
    }

    const clientIdInt = parseInt(clientId);

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query quotations for the specific client
    const clientQuotations = await db
      .select()
      .from(quotations)
      .where(eq(quotations.clientId, clientIdInt))
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(clientQuotations, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}