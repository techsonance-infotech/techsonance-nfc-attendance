
import 'dotenv/config';
import { db } from '../src/db';
import { user } from '../src/db/schema';

async function main() {
    console.log('Testing database connection...');
    try {
        const result = await db.select().from(user).limit(1);
        console.log('Connection successful!');
        console.log('Result:', result);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

main();
