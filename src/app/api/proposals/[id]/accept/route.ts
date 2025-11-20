import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { proposals } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate id is a valid integer
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

    // Check if proposal exists
    const existingProposal = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
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

    // Update proposal with accepted status
    const updatedProposal = await db
      .update(proposals)
      .set({
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(proposals.id, proposalId))
      .returning();

    return NextResponse.json(updatedProposal[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}