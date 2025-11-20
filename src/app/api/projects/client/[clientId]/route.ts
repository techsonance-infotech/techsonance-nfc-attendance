import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    // Validate clientId is a valid integer
    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json(
        { 
          error: 'Valid clientId is required',
          code: 'INVALID_CLIENT_ID'
        },
        { status: 400 }
      );
    }

    const clientIdInt = parseInt(clientId);

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Query projects for the specific client
    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientIdInt))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(clientProjects, { status: 200 });
  } catch (error) {
    console.error('GET projects by client error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}