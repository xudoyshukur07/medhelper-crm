import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Bunday email topilmadi');
          break;
        case 'auth/wrong-password':
          setError('Parol notogri');
          break;
        case 'auth/invalid-email':
          setError('Email notogri formatda');
          break;
        default:
          setError('Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 MedHelper CRM</h1>
        <p>Kirish</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Kutilmoqda...' : 'Kirish'}
          </button>
        </form>
        <div className="login-footer">
          <p>Test hisob:</p>
          <small>Email: test@medhelper.com</small>
          <br />
          <small>Parol: Test123456</small>
        </div>
      </div>
    </div>
  );
}

export default Login;
