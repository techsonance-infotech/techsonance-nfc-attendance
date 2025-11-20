import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { communications } from '@/db/schema';
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

    const clientIdNum = parseInt(clientId);

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query communications for the specific client
    const history = await db
      .select()
      .from(communications)
      .where(eq(communications.clientId, clientIdNum))
      .orderBy(desc(communications.communicationDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error('GET communications history error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}