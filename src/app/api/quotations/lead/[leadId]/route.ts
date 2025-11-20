import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { leadId } = params;

    // Validate leadId
    if (!leadId || isNaN(parseInt(leadId))) {
      return NextResponse.json(
        {
          error: 'Valid lead ID is required',
          code: 'INVALID_LEAD_ID',
        },
        { status: 400 }
      );
    }

    const leadIdInt = parseInt(leadId);

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50'),
      100
    );
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query quotations for the specific lead
    const leadQuotations = await db
      .select()
      .from(quotations)
      .where(eq(quotations.leadId, leadIdInt))
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(leadQuotations, { status: 200 });
  } catch (error) {
    console.error('GET lead quotations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}