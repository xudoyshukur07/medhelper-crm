import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA3L3LhvkAjvDIHzWgsl0fexRe8yqA5b00",
  authDomain: "medhelper-crm.firebaseapp.com",
  projectId: "medhelper-crm",
  storageBucket: "medhelper-crm.firebasestorage.app",
  messagingSenderId: "428276406189",
  appId: "1:428276406189:web:f3613b6c9e6dc1601b7324"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log('✅ Firebase initialized');
