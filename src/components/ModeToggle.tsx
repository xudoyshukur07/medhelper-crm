import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface ModeToggleProps {
  onModeChange?: (mode: 'mobile' | 'desktop') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ onModeChange }) => {
  const { user, firebaseUser } = useAuth();
  const [mode, setMode] = useState<'mobile' | 'desktop'>('desktop');

  // Firebase dan viewMode ni o'qish
  useEffect(() => {
    const loadMode = async () => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.settings?.viewMode) {
              const savedMode = data.settings.viewMode as 'mobile' | 'desktop';
              setMode(savedMode);
              document.documentElement.setAttribute('data-view-mode', savedMode);
              if (onModeChange) onModeChange(savedMode);
              return;
            }
          }
        } catch (error) {
          console.error('ViewMode yuklashda xatolik:', error);
        }
      }
      // Default: desktop
      setMode('desktop');
    };
    loadMode();
  }, [firebaseUser, onModeChange]);

  const toggleMode = async () => {
    const newMode = mode === 'desktop' ? 'mobile' : 'desktop';
    setMode(newMode);
    document.documentElement.setAttribute('data-view-mode', newMode);
    
    if (onModeChange) onModeChange(newMode);

    // Mobil rejimda body ga class qo'shish
    if (newMode === 'mobile') {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }

    // Firebase ga saqlash
    if (firebaseUser) {
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          settings: {
            viewMode: newMode
          }
        }, { merge: true });
      } catch (error) {
        console.error('ViewMode saqlashda xatolik:', error);
      }
    }
  };

  return (
    <button
      onClick={toggleMode}
      className="mode-toggle"
      title={mode === 'desktop' ? '📱 Mobil rejimga o\'tish' : '💻 Desktop rejimga o\'tish'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: mode === 'desktop' ? '#667eea' : '#2ecc71',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000
      }}
    >
      <span>{mode === 'desktop' ? '💻' : '📱'}</span>
      <span>{mode === 'desktop' ? 'Desktop' : 'Mobil'}</span>
      <span style={{
        display: 'inline-block',
        width: '24px',
        height: '14px',
        background: 'rgba(255,255,255,0.3)',
        borderRadius: '10px',
        position: 'relative',
        transition: 'all 0.3s ease'
      }}>
        <span style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          background: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          left: mode === 'desktop' ? '2px' : '12px',
          transition: 'all 0.3s ease'
        }} />
      </span>
    </button>
  );
};

export default ModeToggle;
