import React from 'react';
import { useLanguage, Language } from '../../context/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'uz', label: 'O\'zbek', flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          style={{
            padding: '6px 12px',
            background: language === lang.code ? '#667eea' : '#e8ecf1',
            color: language === lang.code ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.3s ease',
            fontWeight: language === lang.code ? 'bold' : 'normal'
          }}
          onMouseEnter={(e) => {
            if (language !== lang.code) {
              e.currentTarget.style.background = '#d5d9e0';
            }
          }}
          onMouseLeave={(e) => {
            if (language !== lang.code) {
              e.currentTarget.style.background = '#e8ecf1';
            }
          }}
        >
          {lang.flag} {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;