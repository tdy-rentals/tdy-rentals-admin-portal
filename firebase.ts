import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCB_DFz3L86rOj8BY53c_EPPi6d5gWNC_U",
  authDomain: "tdy-rentals.firebaseapp.com",
  projectId: "tdy-rentals",
  storageBucket: "tdy-rentals.firebasestorage.app",
  messagingSenderId: "784078622892",
  appId: "1:784078622892:web:810d41c366dd3eaf3a0f09",
  measurementId: "G-C29MRVYHWV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export useful services
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app);