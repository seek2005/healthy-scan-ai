import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

let currentProfile = {
    ageGroup: "Adults (19-50)",
    dietary: []
};

// Initialize Profile UI Logic
export function initProfile() {
    const settingsBtn = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');

    // Button Listener (Delegate if dynamic or just check existence)
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Close dropdown if open (hacky but needed for semantic interaction)
            settingsModal.classList.remove('hidden');
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // We need the current user. Since we don't import auth here to avoid circular dep, 
            // we rely on the implementation where auth calls loadProfile or we check auth.currentUser
            // But auth.currentUser might be available from firebase-config if we export it or just use getAuth()
            // Let's import auth from config.
            const { auth } = await import('./firebase-config.js');
            const user = auth.currentUser;

            if (!user) {
                alert("Please login to save profile.");
                return;
            }

            const ageGroup = document.getElementById('settingAgeGroup').value;
            const dietary = Array.from(document.querySelectorAll('#settingsForm input[type="checkbox"]:checked'))
                .map(cb => cb.value);

            currentProfile = { ageGroup, dietary };

            try {
                await setDoc(doc(db, "users", user.uid, "settings", "preferences"), currentProfile);
                alert("Preferences Saved!");
                settingsModal.classList.add('hidden');
            } catch (error) {
                console.error("Error saving profile:", error);
                alert("Failed to save.");
            }
        });
    }
}

// Load Profile from Cloud
export async function loadProfile(user) {
    if (!user) return;
    try {
        const docRef = doc(db, "users", user.uid, "settings", "preferences");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProfile = docSnap.data();
            // Update UI
            const ageSelect = document.getElementById('settingAgeGroup');
            if (ageSelect) ageSelect.value = currentProfile.ageGroup || "Adults (19-50)";

            const checkboxes = document.querySelectorAll('#settingsForm input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = currentProfile.dietary?.includes(cb.value);
            });
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

export function getCurrentProfile() {
    return currentProfile;
}
