import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MobileLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5',
      paddingBottom: '60px'
    }}>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <span style={{
          fontSize: '18px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          MedHelper CRM
        </span>
        <button className="menu-btn" onClick={logout}>
          🚪
        </button>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar-mobile ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ borderBottom: '1px solid #2a2a4e', paddingBottom: '16px' }}>
          <h2 style={{ color: 'white', margin: 0 }}>🏥 MedHelper</h2>
          <p style={{ color: '#888', fontSize: '12px' }}>👤 {user?.name}</p>
          <p style={{ color: '#666', fontSize: '11px' }}>🎭 {user?.role}</p>
        </div>
        <nav style={{ marginTop: '16px' }}>
          {[
            { path: '/dashboard', icon: '📊', label: 'Дашборд' },
            { path: '/visits', icon: '📅', label: 'Ташрифлар' },
            { path: '/doctors', icon: '👨‍⚕️', label: 'Врачлар' },
            { path: '/products', icon: '💊', label: 'Препаратлар' },
            { path: '/prescriptions', icon: '📋', label: 'Рецептлар' },
            { path: '/templates', icon: '📋', label: 'Шаблонлар' },
            { path: '/users', icon: '👥', label: 'Фойдаланувчилар' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: '#aaa',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          {user?.role === 'superadmin' && (
            <button
              onClick={() => { navigate('/roles'); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: '#aaa',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <span>🎭</span> Роллар
            </button>
          )}
          <hr style={{ borderColor: '#2a2a4e', margin: '12px 0' }} />
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#e74c3c',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left'
            }}
          >
            🚪 Чиқиш
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main style={{ padding: '12px' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MobileLayout;