import { useAuth } from '../context/AuthContext';

const AIDashboard: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>🤖 AI Дашборд</h1>
      <p>AI функциялари тез орада</p>
      <p>Салом, {user?.name}!</p>
    </div>
  );
};

export default AIDashboard;
