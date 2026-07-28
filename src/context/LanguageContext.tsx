import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'uz' | 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// ===== TARJIMALAR =====
const translations: Record<Language, Record<string, string>> = {
  uz: {
    // Umumiy
    'app.name': 'MedHelper CRM',
    'app.version': 'v8.0',
    'login': 'Кириш',
    'logout': 'Чиқиш',
    'dashboard': 'Дашборд',
    'doctors': 'Врачлар',
    'visits': 'Ташрифлар',
    'prescriptions': 'Рецептлар',
    'products': 'Препаратлар',
    'templates': 'Шаблонлар',
    'users': 'Фойдаланувчилар',
    'roles': 'Роллар',
    'regions': 'Вилоятлар',
    'districts': 'Туманар',
    'plans': 'Режалар',
    'sales': 'Сотувлар',
    'investments': 'Инвестициялар',
    'telegram': 'Телеграмма',
    'ai': 'AI Дашборд',
    'settings': 'Созламалар',
    // Statistika
    'stats.doctors': 'Фаол врачлар',
    'stats.today_visits': 'Бугунги ташрифлар',
    'stats.today_prescriptions': 'Бугунги рецептлар',
    'stats.products': 'Препаратлар',
    'stats.top_doctor': 'Энг кўп ташриф',
    'stats.top_drug': 'Энг кўп ёзилган',
    'stats.growth': 'Ўсиш кўрсатгичи',
    // Xabarlar
    'messages.title': 'Хабар маркази',
    'messages.pending_visits': 'Кутилаётган ташрифлар',
    'messages.expired': 'Муддати ўтган рецептлар',
    'messages.new': 'Янги хабарлар',
    'messages.empty': 'Барчаси жойида! Янги хабарлар йўқ',
    // Sozlamalar
    'settings.theme': 'Мавзу',
    'settings.language': 'Тил',
    'settings.light': 'Ёруғ',
    'settings.dark': 'Қоронғу',
  },
  ru: {
    // Общие
    'app.name': 'MedHelper CRM',
    'app.version': 'v8.0',
    'login': 'Вход',
    'logout': 'Выход',
    'dashboard': 'Дашборд',
    'doctors': 'Врачи',
    'visits': 'Визиты',
    'prescriptions': 'Рецепты',
    'products': 'Препараты',
    'templates': 'Шаблоны',
    'users': 'Пользователи',
    'roles': 'Роли',
    'regions': 'Регионы',
    'districts': 'Районы',
    'plans': 'Планы',
    'sales': 'Продажи',
    'investments': 'Инвестиции',
    'telegram': 'Телеграмма',
    'ai': 'AI Дашборд',
    'settings': 'Настройки',
    // Статистика
    'stats.doctors': 'Активные врачи',
    'stats.today_visits': 'Сегодняшние визиты',
    'stats.today_prescriptions': 'Сегодняшние рецепты',
    'stats.products': 'Препараты',
    'stats.top_doctor': 'Самый активный врач',
    'stats.top_drug': 'Самый назначаемый',
    'stats.growth': 'Показатель роста',
    // Сообщения
    'messages.title': 'Центр сообщений',
    'messages.pending_visits': 'Ожидаемые визиты',
    'messages.expired': 'Просроченные рецепты',
    'messages.new': 'Новые сообщения',
    'messages.empty': 'Всё в порядке! Новых сообщений нет',
    // Настройки
    'settings.theme': 'Тема',
    'settings.language': 'Язык',
    'settings.light': 'Светлая',
    'settings.dark': 'Тёмная',
  },
  en: {
    // General
    'app.name': 'MedHelper CRM',
    'app.version': 'v8.0',
    'login': 'Login',
    'logout': 'Logout',
    'dashboard': 'Dashboard',
    'doctors': 'Doctors',
    'visits': 'Visits',
    'prescriptions': 'Prescriptions',
    'products': 'Products',
    'templates': 'Templates',
    'users': 'Users',
    'roles': 'Roles',
    'regions': 'Regions',
    'districts': 'Districts',
    'plans': 'Plans',
    'sales': 'Sales',
    'investments': 'Investments',
    'telegram': 'Telegram',
    'ai': 'AI Dashboard',
    'settings': 'Settings',
    // Statistics
    'stats.doctors': 'Active Doctors',
    'stats.today_visits': "Today's Visits",
    'stats.today_prescriptions': "Today's Prescriptions",
    'stats.products': 'Products',
    'stats.top_doctor': 'Top Doctor',
    'stats.top_drug': 'Top Drug',
    'stats.growth': 'Growth Rate',
    // Messages
    'messages.title': 'Message Center',
    'messages.pending_visits': 'Pending Visits',
    'messages.expired': 'Expired Prescriptions',
    'messages.new': 'New Messages',
    'messages.empty': 'All good! No new messages',
    // Settings
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};