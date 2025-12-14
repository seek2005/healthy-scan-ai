import { collection, addDoc, getDocs, query, where, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { getHistory, saveToHistory, renderHistory } from "./history.js";

// Save a single scan to Cloud (Firestore)
export async function saveScanToCloud(scanData, user) {
    if (!user) return; // Only save if logged in

    try {
        const historyRef = collection(db, "users", user.uid, "history");
        // Use timestamp as ID to prevent duplicates if needed, or let Firestore gen ID
        await addDoc(historyRef, {
            ...scanData,
            timestamp: new Date().toISOString(), // Ensure standard format
            uniqueId: scanData.timestamp // Use local timestamp as unique tracker
        });
        console.log("Scan saved to cloud");
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// Sync LocalStorage History -> Cloud on Login
export async function syncLocalHistoryToCloud(user) {
    if (!user) return;

    const localHistory = getHistory();
    const historyRef = collection(db, "users", user.uid, "history");

    // 1. Get existing cloud scans to avoid duplicates (basic check)
    // For this MVP, we'll just push local ones that aren't already there? 
    // Or simpler: Just push all local ones that don't have a 'synced' flag?

    // Better strategy for MVP:
    // Just upload everything from local that isn't already in cloud? 
    // Let's do a simple check: Read cloud, compare timestamps.

    // Optimization: Just read last 20 from cloud to merge.
    const q = query(historyRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const cloudTimestamps = new Set();

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.uniqueId) cloudTimestamps.add(data.uniqueId);
    });

    // Upload local scans that are missing in cloud
    for (const scan of localHistory) {
        if (!cloudTimestamps.has(scan.timestamp)) {
            await saveScanToCloud(scan, user);
        }
    }

    // Now re-fetch everything to show unified history (or just render what we have)
    // Actually, let's load everything from cloud to be the "source of truth" now
    await loadCloudHistory(user);
}

// Load Cloud History and Update UI
export async function loadCloudHistory(user) {
    if (!user) return;

    const historyRef = collection(db, "users", user.uid, "history");
    const q = query(historyRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const cloudHistory = [];
    querySnapshot.forEach((doc) => {
        cloudHistory.push(doc.data());
    });

    if (cloudHistory.length > 0) {
        // Merge with local storage (optional, or just replace local for display?)
        // Let's replace the LocalStorage with Cloud Data to ensure consistency across devices
        localStorage.setItem('scanHistory', JSON.stringify(cloudHistory));
        renderHistory();
    }
}
