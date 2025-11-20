import { db } from '@/db';
import { invoiceItems } from '@/db/schema';

async function main() {
    const sampleInvoiceItems = [
        // Invoice 1 items
        {
            invoiceId: 1,
            description: 'Web Development Services - 40 hours',
            quantity: 40,
            unitPrice: 75.00,
            amount: 3000.00,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            invoiceId: 1,
            description: 'UI/UX Design',
            quantity: 20,
            unitPrice: 85.00,
            amount: 1700.00,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            invoiceId: 1,
            description: 'Cloud Hosting - Annual subscription',
            quantity: 1,
            unitPrice: 599.00,
            amount: 599.00,
            createdAt: new Date('2024-01-15').toISOString(),
        },

        // Invoice 2 items
        {
            invoiceId: 2,
            description: 'Digital Marketing Campaign',
            quantity: 1,
            unitPrice: 2500.00,
            amount: 2500.00,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            invoiceId: 2,
            description: 'SEO Optimization Services',
            quantity: 1,
            unitPrice: 1800.00,
            amount: 1800.00,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            invoiceId: 2,
            description: 'Content Writing - 20 articles',
            quantity: 20,
            unitPrice: 50.00,
            amount: 1000.00,
            createdAt: new Date('2024-01-20').toISOString(),
        },

        // Invoice 3 items
        {
            invoiceId: 3,
            description: 'Mobile App Development',
            quantity: 120,
            unitPrice: 95.00,
            amount: 11400.00,
            createdAt: new Date('2024-01-25').toISOString(),
        },
        {
            invoiceId: 3,
            description: 'Technical Support',
            quantity: 10,
            unitPrice: 60.00,
            amount: 600.00,
            createdAt: new Date('2024-01-25').toISOString(),
        },

        // Invoice 4 items
        {
            invoiceId: 4,
            description: 'Logo Design',
            quantity: 1,
            unitPrice: 750.00,
            amount: 750.00,
            createdAt: new Date('2024-02-01').toISOString(),
        },
        {
            invoiceId: 4,
            description: 'Brand Guidelines Development',
            quantity: 1,
            unitPrice: 1200.00,
            amount: 1200.00,
            createdAt: new Date('2024-02-01').toISOString(),
        },
        {
            invoiceId: 4,
            description: 'Business Card Design',
            quantity: 3,
            unitPrice: 150.00,
            amount: 450.00,
            createdAt: new Date('2024-02-01').toISOString(),
        },

        // Invoice 5 items
        {
            invoiceId: 5,
            description: 'Social Media Management - Monthly',
            quantity: 3,
            unitPrice: 800.00,
            amount: 2400.00,
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            invoiceId: 5,
            description: 'Content Creation - 50 posts',
            quantity: 50,
            unitPrice: 25.00,
            amount: 1250.00,
            createdAt: new Date('2024-02-05').toISOString(),
        },

        // Invoice 6 items
        {
            invoiceId: 6,
            description: 'E-commerce Website Development',
            quantity: 80,
            unitPrice: 90.00,
            amount: 7200.00,
            createdAt: new Date('2024-02-10').toISOString(),
        },
        {
            invoiceId: 6,
            description: 'Payment Gateway Integration',
            quantity: 1,
            unitPrice: 1500.00,
            amount: 1500.00,
            createdAt: new Date('2024-02-10').toISOString(),
        },
        {
            invoiceId: 6,
            description: 'Product Photography - 100 items',
            quantity: 100,
            unitPrice: 15.00,
            amount: 1500.00,
            createdAt: new Date('2024-02-10').toISOString(),
        },
        {
            invoiceId: 6,
            description: 'SSL Certificate - Annual',
            quantity: 1,
            unitPrice: 299.00,
            amount: 299.00,
            createdAt: new Date('2024-02-10').toISOString(),
        },

        // Invoice 7 items
        {
            invoiceId: 7,
            description: 'Database Design and Implementation',
            quantity: 30,
            unitPrice: 100.00,
            amount: 3000.00,
            createdAt: new Date('2024-02-15').toISOString(),
        },
        {
            invoiceId: 7,
            description: 'API Development',
            quantity: 25,
            unitPrice: 110.00,
            amount: 2750.00,
            createdAt: new Date('2024-02-15').toISOString(),
        },
        {
            invoiceId: 7,
            description: 'Security Audit',
            quantity: 1,
            unitPrice: 2000.00,
            amount: 2000.00,
            createdAt: new Date('2024-02-15').toISOString(),
        },

        // Invoice 8 items
        {
            invoiceId: 8,
            description: 'Email Marketing Campaign - Quarterly',
            quantity: 1,
            unitPrice: 1800.00,
            amount: 1800.00,
            createdAt: new Date('2024-02-20').toISOString(),
        },
        {
            invoiceId: 8,
            description: 'Newsletter Design Templates',
            quantity: 5,
            unitPrice: 200.00,
            amount: 1000.00,
            createdAt: new Date('2024-02-20').toISOString(),
        },

        // Invoice 9 items
        {
            invoiceId: 9,
            description: 'Video Editing Services - 10 videos',
            quantity: 10,
            unitPrice: 250.00,
            amount: 2500.00,
            createdAt: new Date('2024-02-25').toISOString(),
        },
        {
            invoiceId: 9,
            description: 'Motion Graphics',
            quantity: 5,
            unitPrice: 400.00,
            amount: 2000.00,
            createdAt: new Date('2024-02-25').toISOString(),
        },
        {
            invoiceId: 9,
            description: 'Video Script Writing',
            quantity: 10,
            unitPrice: 100.00,
            amount: 1000.00,
            createdAt: new Date('2024-02-25').toISOString(),
        },

        // Invoice 10 items
        {
            invoiceId: 10,
            description: 'WordPress Maintenance - 6 months',
            quantity: 6,
            unitPrice: 150.00,
            amount: 900.00,
            createdAt: new Date('2024-03-01').toISOString(),
        },
        {
            invoiceId: 10,
            description: 'Plugin Development',
            quantity: 1,
            unitPrice: 1200.00,
            amount: 1200.00,
            createdAt: new Date('2024-03-01').toISOString(),
        },
        {
            invoiceId: 10,
            description: 'Performance Optimization',
            quantity: 1,
            unitPrice: 800.00,
            amount: 800.00,
            createdAt: new Date('2024-03-01').toISOString(),
        },
        {
            invoiceId: 10,
            description: 'Backup Setup and Configuration',
            quantity: 1,
            unitPrice: 350.00,
            amount: 350.00,
            createdAt: new Date('2024-03-01').toISOString(),
        },
    ];

    await db.insert(invoiceItems).values(sampleInvoiceItems);
    
    console.log('✅ Invoice items seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});