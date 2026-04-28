import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, setDoc, doc, where, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbF4MqcYCcERQMvuK6ItEbrE2mIBcjW0U",
  authDomain: "core-engine-416c9.firebaseapp.com",
  projectId: "core-engine-416c9",
  storageBucket: "core-engine-416c9.firebasestorage.app",
  messagingSenderId: "516668931812",
  appId: "1:516668931812:web:4e50d84dfacb51258ab6f1"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signOut, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, setDoc, doc, where, Timestamp };
