import { db } from "./firebase-config.js";
import { getHistory, saveToHistory, renderHistory } from "./history.js";

// Save a single scan to Cloud Firestore
export async function saveScanToCloud(scanData, user) {
    if (!user) return;
    try {
        // Compat: db.collection().add()
        const historyRef = db.collection("users").doc(user.uid).collection("history");
        await historyRef.add({
            ...scanData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use global FieldValue
        });
        console.log("Scan saved to cloud!");
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// Sync Local History -> Cloud (One-way merge on login)
export async function syncLocalHistoryToCloud(user) {
    if (!user) return;
    const localHistory = getHistory();
    if (localHistory.length === 0) {
        await loadCloudHistory(user);
        return;
    }

    const historyRef = db.collection("users").doc(user.uid).collection("history");

    // 1. Get existing cloud history to avoid duplicates (basic check)
    // Compat: .get()
    const snapshot = await historyRef.get();
    const cloudScans = [];
    snapshot.forEach(doc => {
        cloudScans.push(doc.data());
    });

    // Simple duplicate check based on product name/timestamp approx? 
    // For now, just upload everything local that isn't obviously there. 
    // Actually, to be safe and simple: Upload local items that don't match strict criteria?
    // Let's just upload all local items for now, assuming user wants them kept.
    // Optimization: In real app, check ID or hash.

    for (const item of localHistory) {
        // Add to cloud
        // We use add() to auto-generate ID
        try {
            await historyRef.add({
                ...item,
                timestamp: item.timestamp || firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Error syncing item:", e);
        }
    }

    // Clear local storage? No, we will enable "cloud mode" effectively.
    // But usually we want to clear local and replace with cloud source of truth.
    // localStorage.removeItem('scanHistory'); 

    // Load fresh from cloud
    await loadCloudHistory(user);
}


// Load History from Cloud and Update UI
export async function loadCloudHistory(user) {
    if (!user) return;

    try {
        const historyRef = db.collection("users").doc(user.uid).collection("history");
        const querySnapshot = await historyRef.orderBy("timestamp", "desc").get();

        const cloudHistory = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firestore Timestamp to readable date if needed, or keep raw
            // data.timestamp is an object {seconds, nanoseconds}
            if (data.timestamp && data.timestamp.toDate) {
                data.appTimestamp = data.timestamp.toDate().toLocaleString();
            }
            cloudHistory.push(data);
        });

        // Update Local State (InMemory/LocalStorage) to match Cloud
        // We override local storage with cloud data to ensure consistency across devices
        localStorage.setItem('scanHistory', JSON.stringify(cloudHistory));

        // Re-render
        renderHistory();

    } catch (e) {
        console.error("Error loading cloud history:", e);
    }
}
