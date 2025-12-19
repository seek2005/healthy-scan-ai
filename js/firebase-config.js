import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDfOE56zU9yOek2uLR_007IiSMEouCHXnw",
    authDomain: "mini-plataforma.firebaseapp.com",
    projectId: "mini-plataforma",
    storageBucket: "mini-plataforma.firebasestorage.app",
    messagingSenderId: "1009430921994",
    appId: "1:1009430921994:web:d761b6c0bb9db6ce0bb0f3"
};

// Initialize Firebase using Modular SDK
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
