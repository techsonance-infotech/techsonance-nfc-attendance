import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { proposals } from '@/db/schema';
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

    const clientIdInt = parseInt(clientId);

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query proposals for the specific client with pagination
    const clientProposals = await db
      .select()
      .from(proposals)
      .where(eq(proposals.clientId, clientIdInt))
      .orderBy(desc(proposals.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(clientProposals, { status: 200 });
  } catch (error) {
    console.error('GET proposals by client error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}