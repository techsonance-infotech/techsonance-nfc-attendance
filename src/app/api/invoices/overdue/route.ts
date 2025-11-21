import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq, lt, ne, and, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const currentDate = new Date().toISOString().split('T')[0];

    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.createdBy, user.id),
          lt(invoices.dueDate, currentDate),
          ne(invoices.status, 'paid')
        )
      )
      .orderBy(asc(invoices.dueDate))
      .limit(limit)
      .offset(offset);

    const invoicesWithOverdueDays = overdueInvoices.map(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      const timeDiff = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      return {
        ...invoice,
        daysOverdue
      };
    });

    return NextResponse.json(invoicesWithOverdueDays, { status: 200 });
  } catch (error) {
    console.error('GET overdue invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}