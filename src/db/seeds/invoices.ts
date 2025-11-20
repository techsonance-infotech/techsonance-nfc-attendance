import { db } from '@/db';
import { invoices } from '@/db/schema';

async function main() {
    const generateInvoiceNumber = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
        return `INV-${year}-${month}-${random}`;
    };

    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const calculateTax = (subtotal: number, taxRate: number) => {
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;
        return {
            taxAmount: Math.round(taxAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100
        };
    };

    const now = new Date();
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 15);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 10);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 20);
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const draft1IssueDate = yesterday;
    const draft1Tax = calculateTax(15000, 18);
    
    const draft2IssueDate = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
    const draft2Tax = calculateTax(8500, 18);

    const sent1IssueDate = oneWeekAgo;
    const sent1Tax = calculateTax(32000, 18);

    const sent2IssueDate = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));
    const sent2Tax = calculateTax(22500, 18);

    const sent3IssueDate = twoWeeksAgo;
    const sent3Tax = calculateTax(18750, 18);

    const paid1IssueDate = threeMonthsAgo;
    const paid1Tax = calculateTax(45000, 18);

    const paid2IssueDate = twoMonthsAgo;
    const paid2Tax = calculateTax(28000, 18);

    const paid3IssueDate = oneMonthAgo;
    const paid3Tax = calculateTax(35500, 18);

    const overdue1IssueDate = new Date(now.getFullYear(), now.getMonth() - 2, 5);
    const overdue1Tax = calculateTax(12500, 18);

    const overdue2IssueDate = new Date(now.getFullYear(), now.getMonth() - 1, 8);
    const overdue2Tax = calculateTax(27000, 18);

    const sampleInvoices = [
        {
            invoiceNumber: generateInvoiceNumber(draft1IssueDate),
            clientName: 'Tech Solutions Pvt Ltd',
            clientEmail: 'accounts@techsolutions.in',
            clientAddress: '12/A, Tech Park, Whitefield, Bangalore, Karnataka - 560066',
            issueDate: draft1IssueDate.toISOString(),
            dueDate: addDays(draft1IssueDate, 30).toISOString(),
            status: 'draft',
            subtotal: 15000.00,
            taxRate: 18.00,
            taxAmount: draft1Tax.taxAmount,
            totalAmount: draft1Tax.totalAmount,
            notes: 'Payment terms: Net 30 days. Bank transfer preferred.',
            createdBy: 'user_123',
            createdAt: draft1IssueDate.toISOString(),
            updatedAt: draft1IssueDate.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(draft2IssueDate),
            clientName: 'Digital Marketing Co',
            clientEmail: 'billing@digitalmarketing.com',
            clientAddress: '45, MG Road, Indiranagar, Bangalore, Karnataka - 560038',
            issueDate: draft2IssueDate.toISOString(),
            dueDate: addDays(draft2IssueDate, 30).toISOString(),
            status: 'draft',
            subtotal: 8500.00,
            taxRate: 18.00,
            taxAmount: draft2Tax.taxAmount,
            totalAmount: draft2Tax.totalAmount,
            notes: 'Draft invoice for review. Payment via NEFT/RTGS.',
            createdBy: 'user_123',
            createdAt: draft2IssueDate.toISOString(),
            updatedAt: draft2IssueDate.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(sent1IssueDate),
            clientName: 'ABC Enterprises',
            clientEmail: 'finance@abcenterprises.in',
            clientAddress: '78/B, Industrial Area, Phase 2, Peenya, Bangalore, Karnataka - 560058',
            issueDate: sent1IssueDate.toISOString(),
            dueDate: addDays(sent1IssueDate, 30).toISOString(),
            status: 'sent',
            subtotal: 32000.00,
            taxRate: 18.00,
            taxAmount: sent1Tax.taxAmount,
            totalAmount: sent1Tax.totalAmount,
            notes: 'Payment terms: 30 days from invoice date. GST inclusive.',
            createdBy: 'user_123',
            createdAt: sent1IssueDate.toISOString(),
            updatedAt: sent1IssueDate.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(sent2IssueDate),
            clientName: 'XYZ Corporation',
            clientEmail: 'accounts.payable@xyzcorp.co.in',
            clientAddress: 'Plot No 156, Sector 18, Gurugram, Haryana - 122015',
            issueDate: sent2IssueDate.toISOString(),
            dueDate: addDays(sent2IssueDate, 30).toISOString(),
            status: 'sent',
            subtotal: 22500.00,
            taxRate: 18.00,
            taxAmount: sent2Tax.taxAmount,
            totalAmount: sent2Tax.totalAmount,
            notes: 'Invoice sent via email. Payment expected within 30 days.',
            createdBy: 'user_123',
            createdAt: sent2IssueDate.toISOString(),
            updatedAt: sent2IssueDate.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(sent3IssueDate),
            clientName: 'Innovative Systems Ltd',
            clientEmail: 'payments@innovativesystems.in',
            clientAddress: '23, Electronic City, Phase 1, Hosur Road, Bangalore, Karnataka - 560100',
            issueDate: sent3IssueDate.toISOString(),
            dueDate: addDays(sent3IssueDate, 30).toISOString(),
            status: 'sent',
            subtotal: 18750.00,
            taxRate: 18.00,
            taxAmount: sent3Tax.taxAmount,
            totalAmount: sent3Tax.totalAmount,
            notes: 'Net 30 payment terms. Please remit payment to provided bank account.',
            createdBy: 'user_123',
            createdAt: sent3IssueDate.toISOString(),
            updatedAt: sent3IssueDate.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(paid1IssueDate),
            clientName: 'Global Tech Services',
            clientEmail: 'finance@globaltechservices.com',
            clientAddress: '89/12, Cyber Towers, Hitech City, Hyderabad, Telangana - 500081',
            issueDate: paid1IssueDate.toISOString(),
            dueDate: addDays(paid1IssueDate, 30).toISOString(),
            status: 'paid',
            subtotal: 45000.00,
            taxRate: 18.00,
            taxAmount: paid1Tax.taxAmount,
            totalAmount: paid1Tax.totalAmount,
            notes: 'Payment received via bank transfer. Thank you for your business.',
            createdBy: 'user_123',
            createdAt: paid1IssueDate.toISOString(),
            updatedAt: addDays(paid1IssueDate, 15).toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(paid2IssueDate),
            clientName: 'Smart Solutions India',
            clientEmail: 'accounts@smartsolutions.in',
            clientAddress: '34/A, Salt Lake, Sector V, Kolkata, West Bengal - 700091',
            issueDate: paid2IssueDate.toISOString(),
            dueDate: addDays(paid2IssueDate, 30).toISOString(),
            status: 'paid',
            subtotal: 28000.00,
            taxRate: 18.00,
            taxAmount: paid2Tax.taxAmount,
            totalAmount: paid2Tax.totalAmount,
            notes: 'Payment cleared successfully. Invoice marked as paid.',
            createdBy: 'user_123',
            createdAt: paid2IssueDate.toISOString(),
            updatedAt: addDays(paid2IssueDate, 20).toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(paid3IssueDate),
            clientName: 'Metro Business Solutions',
            clientEmail: 'billing@metrobusiness.co.in',
            clientAddress: '67, Connaught Place, New Delhi, Delhi - 110001',
            issueDate: paid3IssueDate.toISOString(),
            dueDate: addDays(paid3IssueDate, 30).toISOString(),
            status: 'paid',
            subtotal: 35500.00,
            taxRate: 18.00,
            taxAmount: paid3Tax.taxAmount,
            totalAmount: paid3Tax.totalAmount,
            notes: 'Full payment received on time. Transaction completed.',
            createdBy: 'user_123',
            createdAt: paid3IssueDate.toISOString(),
            updatedAt: addDays(paid3IssueDate, 25).toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(overdue1IssueDate),
            clientName: 'Coastal Enterprises Pvt Ltd',
            clientEmail: 'payments@coastalenterprises.in',
            clientAddress: '156/B, Marine Drive, Kochi, Kerala - 682031',
            issueDate: overdue1IssueDate.toISOString(),
            dueDate: addDays(overdue1IssueDate, 30).toISOString(),
            status: 'overdue',
            subtotal: 12500.00,
            taxRate: 18.00,
            taxAmount: overdue1Tax.taxAmount,
            totalAmount: overdue1Tax.totalAmount,
            notes: 'OVERDUE: Payment pending. Please settle immediately to avoid late fees.',
            createdBy: 'user_123',
            createdAt: overdue1IssueDate.toISOString(),
            updatedAt: now.toISOString(),
        },
        {
            invoiceNumber: generateInvoiceNumber(overdue2IssueDate),
            clientName: 'Premium Services Group',
            clientEmail: 'finance@premiumservices.com',
            clientAddress: '91/C, Bandra Kurla Complex, Mumbai, Maharashtra - 400051',
            issueDate: overdue2IssueDate.toISOString(),
            dueDate: addDays(overdue2IssueDate, 30).toISOString(),
            status: 'overdue',
            subtotal: 27000.00,
            taxRate: 18.00,
            taxAmount: overdue2Tax.taxAmount,
            totalAmount: overdue2Tax.totalAmount,
            notes: 'URGENT: Payment overdue. Immediate action required.',
            createdBy: 'user_123',
            createdAt: overdue2IssueDate.toISOString(),
            updatedAt: now.toISOString(),
        },
    ];

    await db.insert(invoices).values(sampleInvoices);
    
    console.log('✅ Invoices seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});