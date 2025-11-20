import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { gte, lte, eq, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate pagination parameters
    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json({ 
        error: 'Invalid pagination parameters',
        code: 'INVALID_PAGINATION'
      }, { status: 400 });
    }

    // Calculate today's date and 30 days from now in ISO format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);
    const thirtyDaysFromNowISO = thirtyDaysFromNow.toISOString();

    // Query contracts expiring in the next 30 days
    const expiringContracts = await db.select()
      .from(contracts)
      .where(
        and(
          eq(contracts.status, 'active'),
          gte(contracts.endDate, todayISO),
          lte(contracts.endDate, thirtyDaysFromNowISO)
        )
      )
      .orderBy(asc(contracts.endDate))
      .limit(limit)
      .offset(offset);

    // Calculate days until expiration for each contract
    const contractsWithDaysUntilExpiration = expiringContracts.map(contract => {
      const endDate = new Date(contract.endDate);
      const timeDiff = endDate.getTime() - today.getTime();
      const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      return {
        ...contract,
        daysUntilExpiration
      };
    });

    return NextResponse.json(contractsWithDaysUntilExpiration, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}