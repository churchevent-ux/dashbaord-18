// Import only what we need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAv44mo2ENLXRUCA6DeclWRqRN9m2cbVeA",
  authDomain: "church-event-c8cc9.firebaseapp.com",
  projectId: "church-event-c8cc9",
  storageBucket: "church-event-c8cc9.firebasestorage.app",
  messagingSenderId: "278652351105",
  appId: "1:278652351105:web:c7ce02b4786ec506809380",
  measurementId: "G-FV6XY9QGE3"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth directly
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
