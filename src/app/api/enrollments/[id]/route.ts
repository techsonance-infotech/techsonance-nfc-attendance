import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { nfcTags } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 }
      );
    }

    // Role-based authorization check
    if (user.role !== 'admin' && user.role !== 'hr') {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions. Admin or HR role required',
          code: 'INSUFFICIENT_PERMISSIONS' 
        },
        { status: 403 }
      );
    }

    // Validate ID parameter
    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid enrollment ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if enrollment exists
    const existingEnrollment = await db
      .select()
      .from(nfcTags)
      .where(eq(nfcTags.id, parseInt(id)))
      .limit(1);

    if (existingEnrollment.length === 0) {
      return NextResponse.json(
        { error: 'Enrollment not found', code: 'ENROLLMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Deactivate the enrollment (update status to 'inactive')
    const deactivatedEnrollment = await db
      .update(nfcTags)
      .set({
        status: 'inactive',
      })
      .where(eq(nfcTags.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Enrollment deactivated successfully',
        enrollment: deactivatedEnrollment[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE enrollment error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR' 
      },
      { status: 500 }
    );
  }
}