import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_STAGES = ['new', 'contacted', 'proposal', 'won', 'lost'] as const;
type LeadStage = typeof VALID_STAGES[number];

export async function GET(
  request: NextRequest,
  { params }: { params: { stage: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { stage } = params;

    // Validate stage parameter
    if (!VALID_STAGES.includes(stage as LeadStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
          code: 'INVALID_STAGE'
        },
        { status: 400 }
      );
    }

    // Extract pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50'),
      100
    );
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query leads filtered by stage, ordered by createdAt DESC
    const filteredLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.stage, stage))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(filteredLeads, { status: 200 });
  } catch (error) {
    console.error('GET /api/leads/stage/[stage] error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}