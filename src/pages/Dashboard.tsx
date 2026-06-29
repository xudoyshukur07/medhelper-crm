import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Doctor {
  id: string;
  name: string;
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
}

interface SalesData {
  doctorId: string;
  totalAmount: number;
  totalCommission: number;
}

interface VisitData {
  doctorId: string;
  count: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [visits, setVisits] = useState<VisitData[]>([]);

  useEffect(() => {
    // Демо маълумотлар
    const demoDoctors: Doctor[] = [
      { id: '1', name: 'Алимов Али', totalInvestment: 5000000, totalCommission: 8000000, debt: -3000000, debtStatus: 'profit' },
      { id: '2', name: 'Тангриберганова Дилдора', totalInvestment: 3000000, totalCommission: 5000000, debt: -2000000, debtStatus: 'profit' },
      { id: '3', name: 'Ибрагимов Гани', totalInvestment: 4000000, totalCommission: 3000000, debt: 1000000, debtStatus: 'debt' },
    ];
    setDoctors(demoDoctors);

    const demoSales: SalesData[] = [
      { doctorId: '1', totalAmount: 1500000, totalCommission: 150000 },
      { doctorId: '2', totalAmount: 1000000, totalCommission: 100000 },
    ];
    setSales(demoSales);

    const demoVisits: VisitData[] = [
      { doctorId: '1', count: 12 },
      { doctorId: '2', count: 8 },
      { doctorId: '3', count: 5 },
    ];
    setVisits(demoVisits);
  }, []);

  // Ҳар бир врач учун йиғинди маълумотлар
  const doctorStats = doctors.map(doctor => {
    const doctorSales = sales.filter(s => s.doctorId === doctor.id);
    const doctorVisits = visits.filter(v => v.doctorId === doctor.id);
    
    return {
      ...doctor,
      totalSales: doctorSales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalCommission: doctorSales.reduce((sum, s) => sum + s.totalCommission, 0),
      visitCount: doctorVisits.reduce((sum, v) => sum + v.count, 0)
    };
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>👋 Ассалому алайкум, {user?.name || 'Фойдаланувчи'}!</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>MedHelper CRM дашборди</p>

      {/* Боғланган статистика */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4>👨‍⚕️ Врачлар</h4>
          <h2>{doctors.length}</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>
            🟢 Фойдали: {doctors.filter(d => d.debtStatus === 'profit').length} | 
            🔴 Қарздор: {doctors.filter(d => d.debtStatus === 'debt').length}
          </p>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4>💰 Жами сотув</h4>
          <h2>{sales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()} сўм</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>Барча врачлар бўйича</p>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4>📅 Жами визитлар</h4>
          <h2>{visits.reduce((sum, v) => sum + v.count, 0)}</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>Барча врачлар бўйича</p>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4>📊 ROI</h4>
          <h2 style={{ color: '#2ecc71' }}>+15%</h2>
          <p style={{ color: '#666', fontSize: '13px' }}>Умумий инвестиция самарадорлиги</p>
        </div>
      </div>

      {/* Врачлар бўйича статистика */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 12px' }}>👨‍⚕️ Врачлар бўйича маълумотлар</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Врач</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Сотув</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Комиссия</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Визитлар</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Қарз</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ҳолат</th>
              </tr>
            </thead>
            <tbody>
              {doctorStats.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{doc.name}</td>
                  <td style={{ padding: '8px 12px' }}>{doc.totalSales.toLocaleString()} сўм</td>
                  <td style={{ padding: '8px 12px' }}>{doc.totalCommission.toLocaleString()} сўм</td>
                  <td style={{ padding: '8px 12px' }}>{doc.visitCount}</td>
                  <td style={{ padding: '8px 12px', color: doc.debt > 0 ? '#e74c3c' : '#2ecc71' }}>
                    {Math.abs(doc.debt).toLocaleString()} сўм
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: doc.debtStatus === 'profit' ? '#d4edda' : '#f8d7da',
                      color: doc.debtStatus === 'profit' ? '#155724' : '#721c24'
                    }}>
                      {doc.debtStatus === 'profit' ? '🟢 Фойда' : '🔴 Қарз'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
