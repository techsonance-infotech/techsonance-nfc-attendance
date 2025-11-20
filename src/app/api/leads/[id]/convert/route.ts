import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads, clients } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is a valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const leadId = parseInt(id);

    // Check if lead exists
    const lead = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (lead.length === 0) {
      return NextResponse.json(
        { 
          error: 'Lead not found',
          code: 'LEAD_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const leadData = lead[0];

    // Check if lead is in "won" stage
    if (leadData.stage !== 'won') {
      return NextResponse.json(
        { 
          error: 'Only leads in "won" stage can be converted to clients',
          code: 'LEAD_NOT_WON',
          currentStage: leadData.stage
        },
        { status: 400 }
      );
    }

    const currentTimestamp = new Date().toISOString();

    // Create new client record with data from lead
    const newClient = await db.insert(clients)
      .values({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || null,
        assignedAccountManager: leadData.assignedTo || null,
        status: 'active',
        leadId: leadData.id,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      })
      .returning();

    // Update lead's wonAt timestamp if not already set
    if (!leadData.wonAt) {
      await db.update(leads)
        .set({
          wonAt: currentTimestamp,
          updatedAt: currentTimestamp
        })
        .where(eq(leads.id, leadId));
    }

    return NextResponse.json(newClient[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}