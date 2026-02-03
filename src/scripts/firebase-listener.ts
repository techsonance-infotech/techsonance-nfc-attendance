
import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onChildAdded, onChildChanged, get } from "firebase/database";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { employees, nfcTags, attendanceRecords } from "../db/schema";
import { eq, and } from "drizzle-orm";

console.log("Starting Firebase Sync Service...");

// 1. Initialize Database
const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);

// 2. Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const attendanceRef = ref(database, 'attendance');

console.log("Listening for attendance records at '/attendance'...");

// Helper to calculate duration in minutes
function calculateDuration(dateStr: string, timeIn: string, timeOut: string): number | null {
    if (!timeIn || !timeOut || !dateStr) return null;
    try {
        const inDate = new Date(`${dateStr}T${timeIn}`);
        const outDate = new Date(`${dateStr}T${timeOut}`);
        const diffMs = outDate.getTime() - inDate.getTime();
        const diffMins = Math.round(diffMs / 60000);
        return diffMins > 0 ? diffMins : 0;
    } catch (e) {
        console.error("Error calculating duration:", e);
        return null;
    }
}

// Shared function to process data (for both Added and Changed events)
async function processAttendanceData(tagUid: string, rawData: any) {
    if (!tagUid || !rawData) {
        return;
    }

    // Iterate over dates: { "2026-02-03": { check_in: "...", check_out: "..." } }
    for (const dateKey of Object.keys(rawData)) {
        const entry = rawData[dateKey];
        if (!entry || typeof entry !== 'object' || !entry.check_in) {
            continue;
        }

        const logKey = `${tagUid}_${dateKey}_${entry.check_in}`;

        try {
            // Check if record exists
            const existingRecord = await db.select().from(attendanceRecords).where(eq(attendanceRecords.idempotencyKey, logKey)).limit(1);

            if (existingRecord.length > 0) {
                // Record Exists: Check for UPDATE (Check Out)
                const record = existingRecord[0];

                // If DB has no timeOut, but Firebase has check_out, UPDATE it
                if (!record.timeOut && entry.check_out) {
                    console.log(`[${logKey}] Found Check Out update: ${entry.check_out}`);

                    const duration = calculateDuration(dateKey, record.timeIn, entry.check_out);

                    await db.update(attendanceRecords)
                        .set({
                            timeOut: entry.check_out,
                            duration: duration,
                            metadata: JSON.stringify(entry)
                        })
                        .where(eq(attendanceRecords.id, record.id));

                    console.log(`[${logKey}] ✅ Updated Check Out time & Duration (${duration} min).`);
                }
                // Else: Already up to date
                continue;
            }

            // Record Does Not Exist: INSERT (Check In)
            console.log(`[${logKey}] Processing new Check In for Tag: ${tagUid}`);

            // Find employee 
            let employeeId: number | null = null;
            const tagRecord = await db.select().from(nfcTags).where(eq(nfcTags.tagUid, tagUid)).limit(1);

            if (tagRecord.length > 0) {
                employeeId = tagRecord[0].employeeId;
            } else {
                console.warn(`[${logKey}] Unknown Tag UID: ${tagUid}. Ensure this tag is enrolled.`);
                continue;
            }

            if (!employeeId) {
                console.warn(`[${logKey}] Tag ${tagUid} found but not assigned to an employee.`);
                continue;
            }

            const duration = entry.check_out ? calculateDuration(dateKey, entry.check_in, entry.check_out) : null;

            await db.insert(attendanceRecords).values({
                employeeId: employeeId,
                date: dateKey,
                timeIn: entry.check_in,
                timeOut: entry.check_out || null,
                duration: duration,
                status: "present",
                checkInMethod: "nfc",
                tagUid: tagUid,
                idempotencyKey: logKey,
                metadata: JSON.stringify(entry),
                createdAt: new Date().toISOString()
            });

            console.log(`[${logKey}] ✅ Attendance recorded (In: ${entry.check_in}, Out: ${entry.check_out || '-'}, Dur: ${duration || '-'})`);

        } catch (error) {
            console.error(`[${logKey}] ❌ Error processing log:`, error);
        }
    }
}

// Listen for NEW tags added
onChildAdded(attendanceRef, async (snapshot) => {
    await processAttendanceData(snapshot.key!, snapshot.val());
}, (error) => {
    console.error("❌ onChildAdded Error:", error);
});

// Listen for UPDATES to existing tags (e.g. Check Out added)
onChildChanged(attendanceRef, async (snapshot) => {
    // snapshot.key is the TagUID
    // snapshot.val() is the whole object { "2026-02-03": ... }
    await processAttendanceData(snapshot.key!, snapshot.val());
}, (error) => {
    console.error("❌ onChildChanged Error:", error);
});
