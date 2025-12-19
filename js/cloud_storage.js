import { db } from "./firebase-config.js";
import { collection, doc, addDoc, getDocs, orderBy, query, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { getHistory, renderHistory } from "./history.js";

// Save a single scan to Cloud Firestore
export async function saveScanToCloud(scanData, user) {
    if (!user) return;
    try {
        const historyRef = collection(db, "users", user.uid, "history");
        await addDoc(historyRef, {
            ...scanData,
            timestamp: serverTimestamp()
        });
        console.log("Scan saved to cloud!");

        // Update Streak
        const newStreak = await updateStreak(user);
        if (newStreak) {
            const streakEl = document.getElementById('streakDisplay');
            if (streakEl) {
                streakEl.innerHTML = `🔥 ${newStreak}`;
                streakEl.classList.remove('hidden');
            }
        }

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

    const historyRef = collection(db, "users", user.uid, "history");

    // 1. Get existing cloud history to avoid duplicates (basic check)
    const snapshot = await getDocs(historyRef);
    const cloudScans = [];
    snapshot.forEach(doc => {
        cloudScans.push(doc.data());
    });

    for (const item of localHistory) {
        // Add to cloud
        try {
            await addDoc(historyRef, {
                ...item,
                timestamp: item.timestamp || serverTimestamp()
            });
        } catch (e) {
            console.error("Error syncing item:", e);
        }
    }

    // Load fresh from cloud
    await loadCloudHistory(user);
}


// Load History from Cloud and Update UI
export async function loadCloudHistory(user) {
    if (!user) return;

    try {
        const historyRef = collection(db, "users", user.uid, "history");
        const q = query(historyRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

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
        renderHistory("history-grid");

        // Load Streak too
        await loadStreak(user);

    } catch (e) {
        console.error("Error loading cloud history:", e);
    }
}

// Gamification: Update Streak
export async function updateStreak(user) {
    if (!user) return;
    const streakRef = doc(db, "users", user.uid, "gamification", "streak");
    const today = new Date().toISOString().split('T')[0];

    try {
        const docSnap = await getDoc(streakRef);
        let currentStreak = 1;

        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastDate = data.lastScanDate;

            if (lastDate === today) {
                return data.currentStreak; // Already scanned today, return current
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                currentStreak = (data.currentStreak || 0) + 1;
            } else {
                currentStreak = 1; // Broken streak
            }
        }

        await setDoc(streakRef, {
            currentStreak: currentStreak,
            lastScanDate: today,
            lastUpdated: serverTimestamp()
        });

        console.log(`Streak updated: ${currentStreak} days 🔥`);
        return currentStreak;

    } catch (e) {
        console.error("Error updating streak:", e);
    }
}

export async function loadStreak(user) {
    if (!user) return;
    try {
        const streakRef = doc(db, "users", user.uid, "gamification", "streak");
        const docSnap = await getDoc(streakRef);
        if (docSnap.exists()) {
            const streak = docSnap.data().currentStreak || 0;
            const streakEl = document.getElementById('streakDisplay');
            if (streakEl) {
                streakEl.innerHTML = `🔥 ${streak}`;
                streakEl.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.error("Error loading streak:", e);
    }
}
