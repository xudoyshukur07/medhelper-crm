import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';

interface Doctor {
  id: string;
  name: string;
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
  region?: string;
  district?: string;
  isActive?: boolean;
}

interface VisitData {
  id: string;
  doctorName: string;
  doctorRegion: string;
  doctorDistrict: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  status: string;
  createdAt: any;
}

interface PrescriptionData {
  id: string;
  doctorName: string;
  drugName: string;
  receiptNumber: string;
  doctorDistrictId?: string;
  userId?: string;
  createdAt: any;
  status?: string;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

// ============================================================
// GRAFIK KOMPONENTI
// ============================================================
const HourlyChart: React.FC<{ data: { hour: number; visits: number; prescriptions: number }[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.visits, d.prescriptions)), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '8px 0' }}>
      {data.map((item) => (
        <div key={item.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100%' }}>
            {/* Tashriflar */}
            <div style={{
              width: '12px',
              height: `${(item.visits / maxValue) * 80}px`,
              background: '#2ecc71',
              borderRadius: '4px 4px 0 0',
              minHeight: item.visits > 0 ? '4px' : '0',
              transition: 'height 0.5s ease'
            }} />
            {/* Retseptlar */}
            <div style={{
              width: '12px',
              height: `${(item.prescriptions / maxValue) * 80}px`,
              background: '#f39c12',
              borderRadius: '4px 4px 0 0',
              minHeight: item.prescriptions > 0 ? '4px' : '0',
              transition: 'height 0.5s ease'
            }} />
          </div>
          <span style={{ fontSize: '9px', color: '#888', marginTop: '4px' }}>{item.hour}:00</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// XABAR MARKAZI KOMPONENTI
// ============================================================
const MessageCenter: React.FC<{ 
  pendingVisits: number; 
  expiredPrescriptions: number; 
  newMessages: number 
}> = ({ pendingVisits, expiredPrescriptions, newMessages }) => {
  const navigate = useNavigate();
  const messages = [
    { 
      id: 1, 
      icon: '📅', 
      title: 'Kutilayotgan tashriflar', 
      count: pendingVisits, 
      color: '#f39c12', 
      link: '/visits',
      bg: '#fff3cd'
    },
    { 
      id: 2, 
      icon: '⏰', 
      title: 'Muddati o\'tgan retseptlar', 
      count: expiredPrescriptions, 
      color: '#e74c3c', 
      link: '/prescriptions',
      bg: '#f8d7da'
    },
    { 
      id: 3, 
      icon: '💬', 
      title: 'Yangi xabarlar', 
      count: newMessages, 
      color: '#3498db', 
      link: '/telegram',
      bg: '#cce5ff'
    },
  ];

  const total = pendingVisits + expiredPrescriptions + newMessages;

  if (total === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: '#999',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        ✅ Барчаси жойида! Янги хабарлар йўқ
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
      {messages.map(msg => (
        <div
          key={msg.id}
          onClick={() => msg.count > 0 && navigate(msg.link)}
          style={{
            padding: '12px',
            background: msg.bg,
            borderRadius: '8px',
            cursor: msg.count > 0 ? 'pointer' : 'default',
            opacity: msg.count > 0 ? 1 : 0.5,
            textAlign: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => {
            if (msg.count > 0) e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <div style={{ fontSize: '24px' }}>{msg.icon}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: msg.color }}>{msg.count}</div>
          <div style={{ fontSize: '10px', color: '#666' }}>{msg.title}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// ASOSIY DASHBOARD
// ============================================================
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [todayVisits, setTodayVisits] = useState<VisitData[]>([]);
  const [todayPrescriptions, setTodayPrescriptions] = useState<PrescriptionData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; visits: number; prescriptions: number }[]>([]);
  const [topDoctor, setTopDoctor] = useState<{ name: string; count: number }>({ name: '-', count: 0 });
  const [topDrug, setTopDrug] = useState<{ name: string; count: number }>({ name: '-', count: 0 });
  const [growthRate, setGrowthRate] = useState<{ value: number; direction: 'up' | 'down' }>({ value: 0, direction: 'up' });
  const [pendingVisits, setPendingVisits] = useState(0);
  const [expiredPrescriptions, setExpiredPrescriptions] = useState(0);
  const [newMessages, setNewMessages] = useState(0);

  const userDistricts = (): string[] => {
    if (!user) return [];
    const districts = user.districts || [];
    const districtIds = user.districtIds || [];
    const districtId = user.districtId;
    
    let result: string[] = [];
    if (districtIds && districtIds.length > 0) {
      result = districtIds;
    } else if (districts && districts.length > 0) {
      result = districts.map((d: any) => typeof d === 'string' ? d : d?.id || d).filter(Boolean);
    } else if (districtId) {
      result = [typeof districtId === 'string' ? districtId : districtId?.id || ''];
    }
    return result.filter(Boolean);
  };

  // ============================================================
  // MA'LUMOTLARNI YUKLASH (TUZATILGAN - MP UCHUN)
  // ============================================================
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const districts = userDistricts();
        const isAdmin = ['superadmin', 'admin', 'seo'].includes(user.role || '');
        const isMP = user.role === 'mp';
        const isRM = user.role === 'rm' || user.role === 'ffm';

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        // ===== 1. DOCTORLAR =====
        let doctorsQuery;
        if (isAdmin) {
          doctorsQuery = collection(db, 'doctors');
        } else if (districts.length > 0) {
          doctorsQuery = query(collection(db, 'doctors'), where('districtId', 'in', districts));
        } else {
          doctorsQuery = collection(db, 'doctors');
        }
        const doctorsSnapshot = await getDocs(doctorsQuery);
        const doctorsData = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
        setDoctors(doctorsData);

        // ===== 2. BUGUNGI TASHRIFLAR =====
        let visitsQuery;
        if (isAdmin) {
          visitsQuery = query(collection(db, 'visits'), where('visitDate', '==', todayStr));
        } else if (isMP) {
          visitsQuery = query(
            collection(db, 'visits'), 
            where('userId', '==', user.uid), 
            where('visitDate', '==', todayStr)
          );
        } else if (isRM && districts.length > 0) {
          visitsQuery = query(
            collection(db, 'visits'), 
            where('doctorDistrictId', 'in', districts), 
            where('visitDate', '==', todayStr)
          );
        } else {
          visitsQuery = query(collection(db, 'visits'), where('visitDate', '==', todayStr));
        }
        const visitsSnapshot = await getDocs(visitsQuery);
        const visitsData = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitData));
        setTodayVisits(visitsData);

        // ===== 3. BUGUNGI RETSEPTLAR (MP UCHUN DOCTOR DISTRICT BO'YICHA) =====
        let prescriptionsQuery;
        if (isAdmin) {
          // Admin - barcha retseptlar
          prescriptionsQuery = query(
            collection(db, 'prescriptions'), 
            where('createdAt', '>=', startOfDay)
          );
        } else if (isMP) {
          // 🔴 MP - o'z hududidagi retseptlar (doctorDistrictId bo'yicha)
          if (districts.length > 0) {
            prescriptionsQuery = query(
              collection(db, 'prescriptions'),
              where('doctorDistrictId', 'in', districts),
              where('createdAt', '>=', startOfDay)
            );
          } else {
            // District bo'lmasa, barcha retseptlar
            prescriptionsQuery = query(
              collection(db, 'prescriptions'), 
              where('createdAt', '>=', startOfDay)
            );
          }
        } else if (isRM && districts.length > 0) {
          // RM - o'z hududidagi retseptlar
          prescriptionsQuery = query(
            collection(db, 'prescriptions'),
            where('doctorDistrictId', 'in', districts),
            where('createdAt', '>=', startOfDay)
          );
        } else {
          prescriptionsQuery = query(
            collection(db, 'prescriptions'), 
            where('createdAt', '>=', startOfDay)
          );
        }

        const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
        const prescriptionsData = prescriptionsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as PrescriptionData));
        setTodayPrescriptions(prescriptionsData);

        // ===== 4. PREPARATLAR =====
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductData));
        setProducts(productsData);

        // ============================================================
        // 1.1 BUGUNGI KUN GRAFIGI (Soat bo'yicha)
        // ============================================================
        const hourly: { [key: number]: { visits: number; prescriptions: number } } = {};
        for (let i = 8; i <= 18; i++) {
          hourly[i] = { visits: 0, prescriptions: 0 };
        }

        visitsData.forEach(v => {
          if (v.visitTime) {
            const hour = parseInt(v.visitTime.split(':')[0]);
            if (hour >= 8 && hour <= 18 && hourly[hour]) {
              hourly[hour].visits++;
            }
          }
        });

        prescriptionsData.forEach(p => {
          const date = p.createdAt?.toDate?.() || new Date(p.createdAt);
          const hour = date.getHours();
          if (hour >= 8 && hour <= 18 && hourly[hour]) {
            hourly[hour].prescriptions++;
          }
        });

        setHourlyData(Object.entries(hourly).map(([hour, data]) => ({
          hour: parseInt(hour),
          visits: data.visits,
          prescriptions: data.prescriptions
        })));

        // ============================================================
        // 1.3 STATISTIK WIDGETLAR
        // ============================================================

        // Eng ko'p tashrif vrach
        const doctorVisitCount: { [key: string]: number } = {};
        visitsData.forEach(v => {
          doctorVisitCount[v.doctorName] = (doctorVisitCount[v.doctorName] || 0) + 1;
        });
        const sortedDoctors = Object.entries(doctorVisitCount).sort((a, b) => b[1] - a[1]);
        if (sortedDoctors.length > 0) {
          setTopDoctor({ name: sortedDoctors[0][0], count: sortedDoctors[0][1] });
        }

        // Eng ko'p yozilgan preparat
        const drugCount: { [key: string]: number } = {};
        prescriptionsData.forEach(p => {
          drugCount[p.drugName] = (drugCount[p.drugName] || 0) + 1;
        });
        const sortedDrugs = Object.entries(drugCount).sort((a, b) => b[1] - a[1]);
        if (sortedDrugs.length > 0) {
          setTopDrug({ name: sortedDrugs[0][0], count: sortedDrugs[0][1] });
        }

        // O'sish ko'rsatkichi
        const yesterdayVisitsQuery = query(
          collection(db, 'visits'), 
          where('visitDate', '==', yesterdayStr)
        );
        const yesterdayVisitsSnapshot = await getDocs(yesterdayVisitsQuery);
        const yesterdayCount = yesterdayVisitsSnapshot.docs.length;
        const todayCount = visitsData.length;

        if (yesterdayCount > 0) {
          const growth = ((todayCount - yesterdayCount) / yesterdayCount) * 100;
          setGrowthRate({
            value: Math.abs(Math.round(growth)),
            direction: growth >= 0 ? 'up' : 'down'
          });
        } else {
          setGrowthRate({ value: todayCount > 0 ? 100 : 0, direction: 'up' });
        }

        // ============================================================
        // 1.4 XABAR MARKAZI
        // ============================================================

        // Kutilayotgan tashriflar (status = 'planned')
        const pendingVisitsCount = visitsData.filter(v => v.status === 'planned').length;
        setPendingVisits(pendingVisitsCount);

        // Muddati o'tgan retseptlar (status = 'expired')
        const expiredCount = prescriptionsData.filter(p => p.status === 'expired').length;
        setExpiredPrescriptions(expiredCount);

        // Yangi xabarlar (demo)
        setNewMessages(Math.floor(Math.random() * 5));

        setLoading(false);

      } catch (error) {
        console.error('Dashboard xatolik:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Маълумотлар юкланмоқда...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { title: '👨‍⚕️ Фаол врачлар', value: doctors.filter(d => d.isActive !== false).length, icon: '👨‍⚕️', color: '#667eea', link: '/doctors' },
    { title: '📅 Бугунги ташрифлар', value: todayVisits.length, icon: '📅', color: '#2ecc71', link: '/visits' },
    { title: '📋 Бугунги рецептлар', value: todayPrescriptions.length, icon: '📋', color: '#f39c12', link: '/prescriptions' },
    { title: '💊 Препаратлар', value: products.length, icon: '💊', color: '#e74c3c', link: '/products' },
  ];

  return (
    <div style={{ padding: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px' }}>👋 Салом, {user?.name || 'Foydalanuvchi'}!</h1>
          <p style={{ margin: '2px 0 0', color: '#888', fontSize: '13px' }}>
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ background: '#f8f9fa', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: '#666' }}>
            🎭 {user?.role || 'No role'}
          </span>
          {userDistricts().length > 0 && (
            <span style={{ background: '#e8ecf1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: '#666' }}>
              📍 {userDistricts().length} та тумон
            </span>
          )}
        </div>
      </div>

      {/* Statistik kartalar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {stats.map((stat, index) => (
          <div key={index} onClick={() => stat.link && navigate(stat.link)} style={{
            background: 'white',
            padding: '12px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderLeft: `4px solid ${stat.color}`,
            cursor: stat.link ? 'pointer' : 'default',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px' }}>{stat.icon}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: stat.color }}>{stat.value}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{stat.title}</div>
          </div>
        ))}
      </div>

      {/* ============================================================
          1.1 BUGUNGI KUN GRAFIGI
          ============================================================ */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>📊 Бугунги фаоллик</h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#2ecc71', borderRadius: '2px', marginRight: '4px' }}></span> Ташриф</span>
            <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f39c12', borderRadius: '2px', marginRight: '4px' }}></span> Рецепт</span>
          </div>
        </div>
        <HourlyChart data={hourlyData} />
      </div>

      {/* ============================================================
          1.3 STATISTIK WIDGETLAR
          ============================================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Eng ko'p tashrif vrach */}
        <div style={{ background: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔥</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e74c3c' }}>{topDoctor.name}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>{topDoctor.count} та ташриф</div>
          <div style={{ fontSize: '10px', color: '#999' }}>🏆 Энг кўп ташриф</div>
        </div>

        {/* Eng ko'p yozilgan preparat */}
        <div style={{ background: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>💊</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#9b59b6' }}>{topDrug.name}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>{topDrug.count} та рецепт</div>
          <div style={{ fontSize: '10px', color: '#999' }}>📋 Энг кўп ёзилган</div>
        </div>

        {/* O'sish ko'rsatkichi */}
        <div style={{ background: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>📈</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: growthRate.direction === 'up' ? '#2ecc71' : '#e74c3c' }}>
            {growthRate.direction === 'up' ? '↑' : '↓'} {growthRate.value}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>Кечага нисбатан</div>
          <div style={{ fontSize: '10px', color: '#999' }}>📊 Ўсиш кўрсатгичи</div>
        </div>
      </div>

      {/* ============================================================
          1.4 XABAR MARKAZI
          ============================================================ */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>💬 Хабар маркази</h3>
        <MessageCenter 
          pendingVisits={pendingVisits}
          expiredPrescriptions={expiredPrescriptions}
          newMessages={newMessages}
        />
      </div>

      {/* ============================================================
          MOBIL QURILMALAR UCHUN
          ============================================================ */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .widget-grid {
            grid-template-columns: 1fr !important;
          }
          .message-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;