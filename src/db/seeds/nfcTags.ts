import { db } from '@/db';
import { nfcTags } from '@/db/schema';

async function main() {
    const sampleNfcTags = [
        {
            tagUid: 'NFC-001-A7K9M2X5',
            employeeId: 1,
            status: 'active',
            enrolledAt: new Date('2024-02-01T09:15:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-18T08:45:00Z').toISOString(),
            readerId: 'READER-001',
            createdAt: new Date('2024-02-01T09:15:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-002-B3P8N6W1',
            employeeId: 2,
            status: 'active',
            enrolledAt: new Date('2024-02-05T10:30:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-18T09:10:00Z').toISOString(),
            readerId: 'READER-002',
            createdAt: new Date('2024-02-05T10:30:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-003-C5Q2R7Y4',
            employeeId: 3,
            status: 'active',
            enrolledAt: new Date('2024-02-10T14:20:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-17T16:30:00Z').toISOString(),
            readerId: 'READER-003',
            createdAt: new Date('2024-02-10T14:20:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-004-D8T4S9Z2',
            employeeId: 4,
            status: 'active',
            enrolledAt: new Date('2024-02-15T11:45:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-18T07:55:00Z').toISOString(),
            readerId: 'READER-001',
            createdAt: new Date('2024-02-15T11:45:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-005-E1V6U3A8',
            employeeId: 5,
            status: 'active',
            enrolledAt: new Date('2024-02-20T13:10:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-17T14:20:00Z').toISOString(),
            readerId: 'READER-002',
            createdAt: new Date('2024-02-20T13:10:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-006-F9W7X5B3',
            employeeId: 6,
            status: 'active',
            enrolledAt: new Date('2024-02-25T09:00:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-18T10:15:00Z').toISOString(),
            readerId: 'READER-003',
            createdAt: new Date('2024-02-25T09:00:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-007-G2Y8Z1C6',
            employeeId: 7,
            status: 'active',
            enrolledAt: new Date('2024-03-05T15:30:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-17T17:45:00Z').toISOString(),
            readerId: 'READER-001',
            createdAt: new Date('2024-03-05T15:30:00Z').toISOString(),
        },
        {
            tagUid: 'NFC-008-H4Z3A9D7',
            employeeId: 8,
            status: 'active',
            enrolledAt: new Date('2024-03-13T10:00:00Z').toISOString(),
            enrolledBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            lastUsedAt: new Date('2024-03-18T08:30:00Z').toISOString(),
            readerId: 'READER-002',
            createdAt: new Date('2024-03-13T10:00:00Z').toISOString(),
        },
    ];

    await db.insert(nfcTags).values(sampleNfcTags);
    
    console.log('✅ NFC tags seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});