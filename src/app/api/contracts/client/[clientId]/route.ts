import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
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
          error: 'Valid client ID is required',
          code: 'INVALID_CLIENT_ID'
        },
        { status: 400 }
      );
    }

    const parsedClientId = parseInt(clientId);

    // Extract pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query contracts for the specific client
    const clientContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.clientId, parsedClientId))
      .orderBy(desc(contracts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(clientContracts, { status: 200 });
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