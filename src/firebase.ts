import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyABbipPYMqY-wxjbihPW0veBfwo-VdMlv0",
  authDomain: "amarefarm-503108-9fff1.firebaseapp.com",
  databaseURL: "https://amarefarm-503108-9fff1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "amarefarm-503108-9fff1",
  storageBucket: "amarefarm-503108-9fff1.firebasestorage.app",
  messagingSenderId: "1005200390760",
  appId: "1:1005200390760:web:d1c1848a4e19605ea4d9dd",
  measurementId: "G-22L4DM2J0S"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
