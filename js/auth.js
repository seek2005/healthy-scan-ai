import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase-config.js";
import { syncLocalHistoryToCloud, loadCloudHistory } from "./cloud_storage.js";
import { renderHistory, loadFromHistory } from "./history.js";

export function initAuth() {
    const loginBtn = document.getElementById('loginButton');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutButton');

    // Login Handler
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;
                console.log("Logged in as:", user.displayName);
                // Sync history after login
                await syncLocalHistoryToCloud(user);
            } catch (error) {
                console.error("Login failed:", error);
                alert("Login Error: " + error.message);
            }
        });
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out");
                window.location.reload(); // Reload to clear cloud state
            } catch (error) {
                console.error("Logout failed:", error);
            }
        });
    }

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userProfile) {
                userProfile.classList.remove('hidden');
                userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=User';
            }

            // Load cloud history
            await loadCloudHistory(user);
        } else {
            // User is signed out
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
        }
    });
}
