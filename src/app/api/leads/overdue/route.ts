import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { lt, isNotNull, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { 
          error: 'Invalid limit parameter. Must be a positive number.',
          code: 'INVALID_LIMIT' 
        },
        { status: 400 }
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { 
          error: 'Invalid offset parameter. Must be a non-negative number.',
          code: 'INVALID_OFFSET' 
        },
        { status: 400 }
      );
    }
    
    // Get current date/time as ISO string
    const currentDateTime = new Date().toISOString();
    
    // Query leads with overdue follow-ups
    // nextFollowUp must be:
    // 1. Not null (there is a follow-up scheduled)
    // 2. Less than current time (it's overdue)
    const overdueLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          isNotNull(leads.nextFollowUp),
          lt(leads.nextFollowUp, currentDateTime)
        )
      )
      .orderBy(asc(leads.nextFollowUp))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json(overdueLeads, { status: 200 });
    
  } catch (error) {
    console.error('GET overdue leads error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}