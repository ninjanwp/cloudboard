import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBM7x7FAnBtQQvflytfh6hYI-OZHr2GROw",
  authDomain: "board-app-ff63e.firebaseapp.com",
  projectId: "board-app-ff63e",
  storageBucket: "board-app-ff63e.firebasestorage.app",
  messagingSenderId: "1056791207201",
  appId: "1:1056791207201:web:76f47da299ab8649f0f260",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
