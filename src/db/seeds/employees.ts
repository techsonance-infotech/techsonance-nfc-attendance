import { db } from '@/db';
import { employees } from '@/db/schema';

async function main() {
    const sampleEmployees = [
        {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            nfcCardId: 'NFC-1234-5678',
            department: 'Engineering',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            name: 'Michael Chen',
            email: 'michael.chen@company.com',
            nfcCardId: null,
            department: 'HR',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            name: 'Emily Rodriguez',
            email: 'emily.rodriguez@company.com',
            nfcCardId: 'NFC-9876-5432',
            department: 'Sales',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            createdAt: new Date('2024-02-01').toISOString(),
        },
        {
            name: 'David Kim',
            email: 'david.kim@company.com',
            nfcCardId: null,
            department: 'Marketing',
            photoUrl: null,
            createdAt: new Date('2024-02-10').toISOString(),
        },
        {
            name: 'Jessica Brown',
            email: 'jessica.brown@company.com',
            nfcCardId: null,
            department: 'Operations',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
            createdAt: new Date('2024-02-15').toISOString(),
        }
    ];

    await db.insert(employees).values(sampleEmployees);
    
    console.log('✅ Employees seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});