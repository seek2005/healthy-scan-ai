const firebaseConfig = {
    apiKey: "AIzaSyDfOE56zU9yOek2uLR_007IiSMEouCHXnw",
    authDomain: "mini-plataforma.firebaseapp.com",
    projectId: "mini-plataforma",
    storageBucket: "mini-plataforma.firebasestorage.app",
    messagingSenderId: "1009430921994",
    appId: "1:1009430921994:web:d761b6c0bb9db6ce0bb0f3"
};

// Initialize Firebase using Global Compat namespace
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { auth, db, googleProvider };
