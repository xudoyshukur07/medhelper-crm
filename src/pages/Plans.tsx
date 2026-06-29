import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Plans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Demo ma'lumotlar
    const demoPlans = [
      { id: 1, name: 'Plan 1', target: 100, achieved: 80 },
      { id: 2, name: 'Plan 2', target: 200, achieved: 150 },
      { id: 3, name: 'Plan 3', target: 300, achieved: 290 },
    ];
    setPlans(demoPlans);
    setLoading(false);
  }, []);

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📊 Plan va Fakt</h1>
        <button>+ Yangi plan</button>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f2f5' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Nomi</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Plan</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Fakt</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Bajarilish</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, index) => (
              <tr key={plan.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{index + 1}</td>
                <td style={{ padding: '10px' }}>{plan.name}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{plan.target}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{plan.achieved}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={{
                    background: plan.achieved >= plan.target ? '#4CAF50' : '#ff9800',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {Math.round((plan.achieved / plan.target) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Plans;
