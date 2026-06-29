import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCod_Lx-uuuNIriePrg_QpzeQCWaqCqDcY',
  authDomain: 'telegram-crm-mini-app.firebaseapp.com',
  projectId: 'telegram-crm-mini-app',
  storageBucket: 'telegram-crm-mini-app.firebasestorage.app',
  messagingSenderId: '380419343041',
  appId: '1:380419343041:web:beb8ebdf2d37b2f04f0a40',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
