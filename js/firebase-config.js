import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfOE56zU9yOek2uLR_007IiSMEouCHXnw",
    authDomain: "mini-plataforma.firebaseapp.com",
    projectId: "mini-plataforma",
    storageBucket: "mini-plataforma.firebasestorage.app",
    messagingSenderId: "1009430921994",
    appId: "1:1009430921994:web:d761b6c0bb9db6ce0bb0f3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
