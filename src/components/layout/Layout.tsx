import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Huquqlarni tekshirish
  const canManageUsers = hasPermission('canManageUsers');
  const canManageRegions = hasPermission('canManageRegions');
  const canManageProducts = hasPermission('canManageProducts');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '240px', background: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2a2a4e' }}>
          <h2 style={{ margin: 0, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏥 MedHelper</h2>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>CRM v8.0</p>
        </div>
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          
          {/* ===== ASOSIY ===== */}
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📊 Дашборд</button>
          
          {/* ===== FOYDALANUVCHILAR (faqat huquqi borlar uchun) ===== */}
          {canManageUsers && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>👥 БОШҚАРУВ</div>
              <button onClick={() => navigate('/users')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>👥 Фойдаланувчилар</button>
            </>
          )}
          
          {/* ===== VILOYATLAR (faqat Super Admin va SEO uchun) ===== */}
          {canManageRegions && (
            <button onClick={() => navigate('/regions')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>🗺️ Вилоятлар</button>
          )}
          
          {/* ===== TUMANLAR (faqat Super Admin va SEO uchun) ===== */}
          {canManageRegions && (
            <button onClick={() => navigate('/districts')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📍 Туманар</button>
          )}
          
          {/* ===== SEPARATOR ===== */}
          <div style={{ padding: '4px 16px', borderBottom: '1px solid #2a2a4e', margin: '8px 0' }}></div>

          {/* ===== DOKTORLAR ===== */}
          <button onClick={() => navigate('/doctors')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>👨‍⚕️ Врачлар</button>
          
          <button onClick={() => navigate('/visits')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📅 Ташрифлар</button>
          
          <button onClick={() => navigate('/groups')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📂 Гуруҳлар</button>
          
          <button onClick={() => navigate('/products')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>💊 Препаратлар</button>
          
          <button onClick={() => navigate('/templates')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📋 Shablonlar</button>
          
          <button onClick={() => navigate('/sales')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>💰 Сотувлар</button>
          
          <button onClick={() => navigate('/investments')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>💵 Инвестициялар</button>
          
          <button onClick={() => navigate('/prescriptions')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📋 Рецептлар</button>
          
          <button onClick={() => navigate('/plans')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>📊 План ва факт</button>
          
          <button onClick={() => navigate('/regions-old')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>🗺️ Регионлар</button>
          
          <button onClick={() => navigate('/telegram')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>🤖 Телеграмма</button>
          
          <button onClick={() => navigate('/ai-dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a4e'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}>🤖 AI Дашборд</button>
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #2a2a4e' }}>
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>👤 {user?.name}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>🚪 Чиқиш</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '24px', background: '#f0f2f5' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

