import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotations } from '@/db/schema';
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
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rejectedReason } = body;

    const existingQuotation = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, parseInt(id)))
      .limit(1);

    if (existingQuotation.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found', code: 'QUOTATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await db
      .update(quotations)
      .set({
        status: 'rejected',
        rejectedReason: rejectedReason || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update quotation', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}