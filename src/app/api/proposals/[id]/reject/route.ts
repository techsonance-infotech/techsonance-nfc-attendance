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

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const proposalId = parseInt(id);

    // Parse request body to get optional rejectionReason
    const body = await request.json();
    const { rejectionReason } = body;

    // Check if proposal exists
    const existingProposal = await db.select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .limit(1);

    if (existingProposal.length === 0) {
      return NextResponse.json(
        { 
          error: "Proposal not found",
          code: "PROPOSAL_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    // Update proposal with rejected status
    const updated = await db.update(proposals)
      .set({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(proposals.id, proposalId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PATCH reject proposal error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}