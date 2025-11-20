import { db } from '@/db';
import { quotationItems } from '@/db/schema';

async function main() {
    const sampleQuotationItems = [
        // Quotation 1: 3 items
        {
            quotationId: 1,
            description: 'Web Development - 80 hours',
            quantity: 80,
            unitPrice: 2500,
            total: 200000,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            quotationId: 1,
            description: 'Database Setup and Configuration',
            quantity: 1,
            unitPrice: 45000,
            total: 45000,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            quotationId: 1,
            description: 'UI/UX Design - 40 hours',
            quantity: 40,
            unitPrice: 2000,
            total: 80000,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        // Quotation 2: 2 items
        {
            quotationId: 2,
            description: 'Annual Software License - Enterprise Plan',
            quantity: 10,
            unitPrice: 25000,
            total: 250000,
            createdAt: new Date('2024-01-20T14:15:00').toISOString(),
        },
        {
            quotationId: 2,
            description: 'Priority Support Package - 12 months',
            quantity: 1,
            unitPrice: 50000,
            total: 50000,
            createdAt: new Date('2024-01-20T14:15:00').toISOString(),
        },
        // Quotation 3: 2 items
        {
            quotationId: 3,
            description: 'Custom Module Development',
            quantity: 1,
            unitPrice: 180000,
            total: 180000,
            createdAt: new Date('2024-02-01T09:00:00').toISOString(),
        },
        {
            quotationId: 3,
            description: 'Testing and Quality Assurance - 20 hours',
            quantity: 20,
            unitPrice: 1500,
            total: 30000,
            createdAt: new Date('2024-02-01T09:00:00').toISOString(),
        },
        // Quotation 4: 4 items
        {
            quotationId: 4,
            description: 'Training Session - Basic (2 days)',
            quantity: 2,
            unitPrice: 15000,
            total: 30000,
            createdAt: new Date('2024-02-05T11:30:00').toISOString(),
        },
        {
            quotationId: 4,
            description: 'Training Session - Advanced (3 days)',
            quantity: 3,
            unitPrice: 18000,
            total: 54000,
            createdAt: new Date('2024-02-05T11:30:00').toISOString(),
        },
        {
            quotationId: 4,
            description: 'Training Materials and Documentation',
            quantity: 5,
            unitPrice: 5000,
            total: 25000,
            createdAt: new Date('2024-02-05T11:30:00').toISOString(),
        },
        {
            quotationId: 4,
            description: 'Post-Training Support - 3 months',
            quantity: 1,
            unitPrice: 35000,
            total: 35000,
            createdAt: new Date('2024-02-05T11:30:00').toISOString(),
        },
        // Quotation 5: 2 items
        {
            quotationId: 5,
            description: 'Cloud Infrastructure Setup',
            quantity: 1,
            unitPrice: 75000,
            total: 75000,
            createdAt: new Date('2024-02-10T16:45:00').toISOString(),
        },
        {
            quotationId: 5,
            description: 'Monthly Cloud Hosting - 12 months',
            quantity: 12,
            unitPrice: 8000,
            total: 96000,
            createdAt: new Date('2024-02-10T16:45:00').toISOString(),
        },
        // Quotation 6: 2 items
        {
            quotationId: 6,
            description: 'Mobile App Development - iOS',
            quantity: 1,
            unitPrice: 350000,
            total: 350000,
            createdAt: new Date('2024-02-15T10:00:00').toISOString(),
        },
        {
            quotationId: 6,
            description: 'App Store Submission and Publishing',
            quantity: 1,
            unitPrice: 15000,
            total: 15000,
            createdAt: new Date('2024-02-15T10:00:00').toISOString(),
        },
        // Quotation 7: 2 items
        {
            quotationId: 7,
            description: 'API Integration - Payment Gateway',
            quantity: 1,
            unitPrice: 65000,
            total: 65000,
            createdAt: new Date('2024-02-20T13:20:00').toISOString(),
        },
        {
            quotationId: 7,
            description: 'API Integration - SMS Service',
            quantity: 1,
            unitPrice: 35000,
            total: 35000,
            createdAt: new Date('2024-02-20T13:20:00').toISOString(),
        },
        // Quotation 8: 3 items
        {
            quotationId: 8,
            description: 'Security Audit and Penetration Testing',
            quantity: 1,
            unitPrice: 120000,
            total: 120000,
            createdAt: new Date('2024-02-25T15:30:00').toISOString(),
        },
        {
            quotationId: 8,
            description: 'SSL Certificate - 2 years',
            quantity: 2,
            unitPrice: 12000,
            total: 24000,
            createdAt: new Date('2024-02-25T15:30:00').toISOString(),
        },
        {
            quotationId: 8,
            description: 'Security Compliance Documentation',
            quantity: 1,
            unitPrice: 30000,
            total: 30000,
            createdAt: new Date('2024-02-25T15:30:00').toISOString(),
        },
    ];

    await db.insert(quotationItems).values(sampleQuotationItems);
    
    console.log('✅ Quotation items seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});