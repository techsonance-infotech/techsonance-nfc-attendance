import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    // Validate invoiceId
    if (!invoiceId || isNaN(parseInt(invoiceId))) {
      return NextResponse.json(
        {
          error: 'Valid invoice ID is required',
          code: 'INVALID_INVOICE_ID',
        },
        { status: 400 }
      );
    }

    const parsedInvoiceId = parseInt(invoiceId);

    // Get all payments for the invoice, sorted by payment date descending
    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, parsedInvoiceId))
      .orderBy(desc(payments.paymentDate));

    // Return 404 if no payments found
    if (invoicePayments.length === 0) {
      return NextResponse.json(
        {
          error: 'No payments found for this invoice',
          code: 'PAYMENTS_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Calculate total paid amount
    const totalPaid = invoicePayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Return payments array and total paid amount
    return NextResponse.json(
      {
        payments: invoicePayments,
        totalPaid: totalPaid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET payments error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}