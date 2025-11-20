import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { communications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params;

    // Validate leadId is a valid integer
    if (!leadId || isNaN(parseInt(leadId))) {
      return NextResponse.json(
        { 
          error: "Valid lead ID is required",
          code: "INVALID_LEAD_ID" 
        },
        { status: 400 }
      );
    }

    const leadIdInt = parseInt(leadId);

    // Extract pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query communications for the specific lead with pagination
    const communicationHistory = await db
      .select()
      .from(communications)
      .where(eq(communications.leadId, leadIdInt))
      .orderBy(desc(communications.communicationDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(communicationHistory, { status: 200 });
  } catch (error) {
    console.error('GET communications by leadId error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}