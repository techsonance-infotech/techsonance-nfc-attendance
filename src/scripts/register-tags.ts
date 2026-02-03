
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { employees, nfcTags } from "../db/schema";
import { eq } from "drizzle-orm";

const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);

const tagsToRegister = [
    {
        tagUid: "04:19:91:CA:E8:14:91",
        name: "RTJS",
        employeeCode: "TS10008",
        designation: "MNGR"
    },
    {
        tagUid: "04:8D:17:CA:E8:14:90",
        name: "SAIR",
        employeeCode: "TS10004",
        designation: "ENGR"
    }
];

async function registerTags() {
    console.log("Starting Tag Registration...");

    for (const data of tagsToRegister) {
        // 1. Ensure Employee Exists
        // We assume 'nfcCardId' in employees table might store the 'TSxxxx' code for now, or we just rely on name/email.
        // Let's check by name first to avoid duplicates if possible, or create new.

        let employeeId: number;

        // 1. Check if employee exists by nfcCardId (most reliable)
        const entriesByCode = await db.select().from(employees).where(eq(employees.nfcCardId, data.employeeCode)).limit(1);

        if (entriesByCode.length > 0) {
            console.log(`✅ Employee ${data.name} (Code: ${data.employeeCode}) already exists (ID: ${entriesByCode[0].id}).`);
            employeeId = entriesByCode[0].id;
        } else {
            // Check by Name as fallback (if code is null/different)
            const entriesByName = await db.select().from(employees).where(eq(employees.name, data.name)).limit(1);

            if (entriesByName.length > 0) {
                console.log(`✅ Employee ${data.name} already exists (ID: ${entriesByName[0].id}). Updating Code...`);
                await db.update(employees).set({ nfcCardId: data.employeeCode }).where(eq(employees.id, entriesByName[0].id));
                employeeId = entriesByName[0].id;
            } else {
                console.log(`Creating new employee ${data.name}...`);
                const newEmp = await db.insert(employees).values({
                    name: data.name,
                    email: `${data.name.toLowerCase().replace(/\s/g, '')}@techsonance.com`,
                    nfcCardId: data.employeeCode,
                    department: data.designation,
                    status: "active",
                    createdAt: new Date().toISOString()
                }).returning();
                employeeId = newEmp[0].id;
                console.log(`✅ Created Employee ${data.name} (ID: ${employeeId}).`);
            }
        }


        // 2. Register NFC Tag
        const existingTag = await db.select().from(nfcTags).where(eq(nfcTags.tagUid, data.tagUid)).limit(1);

        if (existingTag.length > 0) {
            console.log(`ℹ️ Tag ${data.tagUid} already registered.`);
            // Update mapping just in case?
            if (existingTag[0].employeeId !== employeeId) {
                await db.update(nfcTags).set({ employeeId: employeeId }).where(eq(nfcTags.tagUid, data.tagUid));
                console.log(`   Updated tag mapping to Employee ID ${employeeId}.`);
            }
        } else {
            await db.insert(nfcTags).values({
                tagUid: data.tagUid,
                employeeId: employeeId,
                status: "active",
                enrolledAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Registered Tag ${data.tagUid} for Employee ${data.name}.`);
        }
    }
    console.log("Registration complete.");
}

registerTags();
