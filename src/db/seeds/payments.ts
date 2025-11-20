import { db } from '@/db';
import { payments } from '@/db/schema';

async function main() {
    const samplePayments = [
        {
            invoiceId: 6,
            paymentDate: new Date('2024-03-15').toISOString(),
            amount: 12200.00,
            paymentMethod: 'bank_transfer',
            transactionId: 'TXN202403150001',
            notes: 'Full payment received via NEFT',
            createdAt: new Date('2024-03-15').toISOString(),
        },
        {
            invoiceId: 7,
            paymentDate: new Date('2024-03-18').toISOString(),
            amount: 7380.00,
            paymentMethod: 'upi',
            transactionId: 'UPI202403180234',
            notes: 'Payment received via UPI',
            createdAt: new Date('2024-03-18').toISOString(),
        },
        {
            invoiceId: 8,
            paymentDate: new Date('2024-03-20').toISOString(),
            amount: 18450.00,
            paymentMethod: 'card',
            transactionId: 'CARD202403200567',
            notes: 'Credit card payment processed',
            createdAt: new Date('2024-03-20').toISOString(),
        },
        {
            invoiceId: 5,
            paymentDate: new Date('2024-03-10').toISOString(),
            amount: 3000.00,
            paymentMethod: 'bank_transfer',
            transactionId: 'TXN202403100045',
            notes: 'Partial payment - first installment',
            createdAt: new Date('2024-03-10').toISOString(),
        },
        {
            invoiceId: 5,
            paymentDate: new Date('2024-03-25').toISOString(),
            amount: 2460.00,
            paymentMethod: 'cheque',
            transactionId: null,
            notes: 'Partial payment - second installment via cheque #000123',
            createdAt: new Date('2024-03-25').toISOString(),
        },
    ];

    await db.insert(payments).values(samplePayments);
    
    console.log('✅ Payments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});