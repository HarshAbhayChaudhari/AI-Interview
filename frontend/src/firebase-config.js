// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABAv3Pv87BGaS0mjn6KKUAMQ0BrTR5O1E",
  authDomain: "ai-interview-a68d2.firebaseapp.com",
  projectId: "ai-interview-a68d2",
  storageBucket: "ai-interview-a68d2.firebasestorage.app",
  messagingSenderId: "446216158419",
  appId: "1:446216158419:web:e4e1675434f48b00a56826",
  measurementId: "G-6SWV9DKE1D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
