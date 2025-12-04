import { db } from '@/db';
import { readerDevices } from '@/db/schema';

async function main() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const sampleReaders = [
        {
            readerId: 'READER-001',
            name: 'Main Gate Reader',
            location: 'Main Entrance Gate',
            type: 'ethernet',
            status: 'online',
            ipAddress: '192.168.1.101',
            lastHeartbeat: oneHourAgo.toISOString(),
            config: JSON.stringify({
                scanTimeout: 5,
                beepOnScan: true,
                ledEnabled: true
            }),
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: now.toISOString(),
        },
        {
            readerId: 'READER-002',
            name: 'Office Floor 1 Reader',
            location: 'Floor 1 Reception',
            type: 'usb',
            status: 'online',
            ipAddress: null,
            lastHeartbeat: twoHoursAgo.toISOString(),
            config: JSON.stringify({
                scanTimeout: 3,
                beepOnScan: true
            }),
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: now.toISOString(),
        },
        {
            readerId: 'READER-003',
            name: 'Office Floor 2 Reader',
            location: 'Floor 2 Entry',
            type: 'ethernet',
            status: 'offline',
            ipAddress: '192.168.1.103',
            lastHeartbeat: twoDaysAgo.toISOString(),
            config: JSON.stringify({
                scanTimeout: 5,
                beepOnScan: false,
                ledEnabled: true
            }),
            createdAt: new Date('2024-02-01').toISOString(),
            updatedAt: twoDaysAgo.toISOString(),
        }
    ];

    await db.insert(readerDevices).values(sampleReaders);
    
    console.log('✅ Reader devices seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});