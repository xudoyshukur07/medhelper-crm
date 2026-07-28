import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: isDark ? '#2a2a4e' : '#e8ecf1',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        color: isDark ? '#ffffff' : '#333333',
        fontSize: '14px',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {isDark ? '🌙' : '☀️'}
      </span>
      <span>{isDark ? 'Qorong\'u' : 'Yorug\''}</span>
    </button>
  );
};

export default ThemeToggle;