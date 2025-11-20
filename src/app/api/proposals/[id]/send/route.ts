import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { proposals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const proposalId = parseInt(id);

    const existingProposal = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.createdBy, parseInt(user.id))
        )
      )
      .limit(1);

    if (existingProposal.length === 0) {
      return NextResponse.json(
        { 
          error: 'Proposal not found',
          code: 'PROPOSAL_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const currentTimestamp = new Date().toISOString();

    const updatedProposal = await db
      .update(proposals)
      .set({
        status: 'sent',
        sentAt: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.createdBy, parseInt(user.id))
        )
      )
      .returning();

    if (updatedProposal.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update proposal',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProposal[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}