
import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

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
import { getAuth, signInAnonymously } from "firebase/auth";

const simulatePush = async () => {
    try {
        const auth = getAuth(app);
        await signInAnonymously(auth);
        console.log("Signed in anonymously");

        const attendanceRef = ref(database, 'attendance_logs');

        // Push a dummy record
        // Note: You need a valid NFC Tag UID that exists in your nfc_tags table for this to be processed correctly.
        // I will use a placeholder. The listener should log "Unknown Tag UID" if it doesn't exist, which confirms the listener is working.
        await push(attendanceRef, {
            tagUid: "TEST_TAG_123",
            timestamp: new Date().toISOString()
        });

        console.log("✅ Dummy data pushed to /attendance_logs");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to push data:", error);
        process.exit(1);
    }
};

simulatePush();
