import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Email ёки пароль хатo');
      }
    } catch (err) {
      setError('Тизимда хатолик юз берди');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', fontSize: '28px', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏥 MedHelper CRM</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Тизимга кириш</p>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>{error}</div>}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@medhelper.uz" style={{ width: '100%', padding: '10px', border: '1px solid #e8ecf1', borderRadius: '8px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '10px', border: '1px solid #e8ecf1', borderRadius: '8px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            {loading ? 'Кирилмоқда...' : 'Кириш'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#666', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
            👤 admin@medhelper.uz / admin123
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
