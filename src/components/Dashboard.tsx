import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';

function Dashboard() {
  const [stats, setStats] = useState({
    contacts: 0,
    patients: 0,
    appointments: 0
  });

  useEffect(() => {
    const contactsQuery = query(collection(db, 'contacts'));
    const unsub1 = onSnapshot(contactsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, contacts: snapshot.size }));
    });

    const patientsQuery = query(collection(db, 'patients'));
    const unsub2 = onSnapshot(patientsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, patients: snapshot.size }));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Chiqishda xatolik:', error);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>📊 MedHelper CRM</h1>
        <div>
          <span className="user-email">{auth.currentUser?.email}</span>
          <button onClick={handleLogout} className="logout">🚪 Chiqish</button>
        </div>
      </header>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📞 Kontaktlar</h3>
          <p className="stat-number">{stats.contacts}</p>
        </div>
        <div className="stat-card">
          <h3>👨‍⚕️ Bemorlar</h3>
          <p className="stat-number">{stats.patients}</p>
        </div>
        <div className="stat-card">
          <h3>📅 Qabullar</h3>
          <p className="stat-number">{stats.appointments}</p>
        </div>
      </div>

      <div className="welcome">
        <h2>👋 Xush kelibsiz!</h2>
        <p>Siz MedHelper CRM tizimiga muvaffaqiyatli kirdingiz.</p>
      </div>
    </div>
  );
}

export default Dashboard;

