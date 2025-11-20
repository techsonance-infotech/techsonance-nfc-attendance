import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is a valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const quotationId = parseInt(id);

    // Check if quotation exists
    const existingQuotation = await db.select()
      .from(quotations)
      .where(eq(quotations.id, quotationId))
      .limit(1);

    if (existingQuotation.length === 0) {
      return NextResponse.json(
        { 
          error: "Quotation not found",
          code: "QUOTATION_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    // Update quotation with accepted status
    const currentTimestamp = new Date().toISOString();
    
    const updatedQuotation = await db.update(quotations)
      .set({
        status: 'accepted',
        acceptedAt: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .where(eq(quotations.id, quotationId))
      .returning();

    return NextResponse.json(updatedQuotation[0], { status: 200 });

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