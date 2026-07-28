import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ThemeToggle from '../common/ThemeToggle';
import LanguageToggle from '../common/LanguageToggle';

const Layout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Huquqlarni tekshirish
  const canManageUsers = hasPermission('canManageUsers');
  const canManageRegions = hasPermission('canManageRegions');
  const canManageProducts = hasPermission('canManageProducts');
  const canManageRoles = hasPermission('canManageRoles');

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      background: isDark ? '#12121a' : '#f0f2f5'
    }}>
      <aside style={{ 
        width: '240px', 
        background: isDark ? '#0f0f1a' : '#1a1a2e', 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2a2a4e' }}>
          <h2 style={{ 
            margin: 0, 
            background: 'linear-gradient(135deg, #667eea, #764ba2)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            🏥 MedHelper
          </h2>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
            {t('app.version')}
          </p>
        </div>
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          
          {/* ===== ASOSIY ===== */}
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📊 {t('dashboard')}
          </button>
          
          {/* ===== ROLLAR VA RUXSATLAR ===== */}
          {canManageRoles && (
            <button 
              onClick={() => navigate('/roles')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '10px 16px', 
                background: 'transparent', 
                color: '#aaa', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                width: '100%', 
                textAlign: 'left', 
                fontSize: '14px' 
              }} 
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
            >
              🎭 {t('roles')}
            </button>
          )}
          
          {/* ===== FOYDALANUVCHILAR ===== */}
          {canManageUsers && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                👥 {t('users')}
              </div>
              <button 
                onClick={() => navigate('/users')} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 16px', 
                  background: 'transparent', 
                  color: '#aaa', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  width: '100%', 
                  textAlign: 'left', 
                  fontSize: '14px' 
                }} 
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
              >
                👥 {t('users')}
              </button>
            </>
          )}
          
          {/* ===== VILOYATLAR ===== */}
          {canManageRegions && (
            <button 
              onClick={() => navigate('/regions')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '10px 16px', 
                background: 'transparent', 
                color: '#aaa', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                width: '100%', 
                textAlign: 'left', 
                fontSize: '14px' 
              }} 
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
            >
              🗺️ {t('regions')}
            </button>
          )}
          
          {/* ===== TUMANLAR ===== */}
          {canManageRegions && (
            <button 
              onClick={() => navigate('/districts')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '10px 16px', 
                background: 'transparent', 
                color: '#aaa', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                width: '100%', 
                textAlign: 'left', 
                fontSize: '14px' 
              }} 
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
            >
              📍 {t('districts')}
            </button>
          )}
          
          {/* ===== SEPARATOR ===== */}
          <div style={{ padding: '4px 16px', borderBottom: '1px solid #2a2a4e', margin: '8px 0' }}></div>

          {/* ===== DOKTORLAR ===== */}
          <button 
            onClick={() => navigate('/doctors')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            👨‍⚕️ {t('doctors')}
          </button>
          
          <button 
            onClick={() => navigate('/visits')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📅 {t('visits')}
          </button>
          
          <button 
            onClick={() => navigate('/groups')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📂 Гуруҳлар
          </button>
          
          <button 
            onClick={() => navigate('/products')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            💊 {t('products')}
          </button>
          
          <button 
            onClick={() => navigate('/templates')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📋 {t('templates')}
          </button>
          
          <button 
            onClick={() => navigate('/sales')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            💰 {t('sales')}
          </button>
          
          <button 
            onClick={() => navigate('/investments')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            💵 {t('investments')}
          </button>
          
          <button 
            onClick={() => navigate('/prescriptions')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📋 {t('prescriptions')}
          </button>
          
          <button 
            onClick={() => navigate('/plans')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            📊 {t('plans')}
          </button>
          
          <button 
            onClick={() => navigate('/telegram')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            🤖 {t('telegram')}
          </button>
          
          <button 
            onClick={() => navigate('/ai-dashboard')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 16px', 
              background: 'transparent', 
              color: '#aaa', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left', 
              fontSize: '14px' 
            }} 
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
          >
            🤖 {t('ai')}
          </button>
        </nav>
        
        <div style={{ padding: '16px', borderTop: '1px solid #2a2a4e' }}>
          {/* ===== THEME VA LANGUAGE TOGGLE ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <ThemeToggle />
            <LanguageToggle />
          </div>
          
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
            👤 {user?.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            🎭 {user?.role || 'No role'}
          </div>
          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              padding: '8px', 
              background: '#e74c3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '14px' 
            }}
          >
            🚪 {t('logout')}
          </button>
        </div>
      </aside>
      
      <main style={{ 
        flex: 1, 
        padding: '24px', 
        background: isDark ? '#12121a' : '#f0f2f5',
        color: isDark ? '#ffffff' : '#1a1a2e'
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;