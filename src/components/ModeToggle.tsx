import React, { useState, useEffect } from 'react';

interface ModeToggleProps {
  onModeChange?: (mode: 'mobile' | 'desktop') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ onModeChange }) => {
  const [mode, setMode] = useState<'mobile' | 'desktop'>(
    () => (localStorage.getItem('viewMode') as 'mobile' | 'desktop') || 'desktop'
  );

  useEffect(() => {
    localStorage.setItem('viewMode', mode);
    document.documentElement.setAttribute('data-view-mode', mode);
    if (onModeChange) onModeChange(mode);
    
    // Mobil rejimda body ga class qo'shish
    if (mode === 'mobile') {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }, [mode, onModeChange]);

  const toggleMode = () => {
    setMode(prev => prev === 'desktop' ? 'mobile' : 'desktop');
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
