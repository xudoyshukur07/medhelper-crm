import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface Investment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorPhone: string;
  doctorRegion: string;
  doctorDistrict: string;
  mpId: string;
  projectId: string;
  amount: number;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  products: { productName: string; amount: number }[];
  expectedReturn?: number;
  actualReturn?: number;
  roi?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  region: string;
  district: string;
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
}

interface AIRecommendation {
  doctorId: string;
  doctorName: string;
  doctorRegion: string;
  doctorDistrict: string;
  productName: string;
  recommendedAmount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const Investments: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'manual' | 'import' | 'list'>('ai');
  
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'active' | 'completed'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [manualProducts, setManualProducts] = useState<{ productName: string; amount: number }[]>([
    { productName: '', amount: 0 }
  ]);
  const [importMonth, setImportMonth] = useState(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    doctorPhone: '',
    doctorRegion: '',
    doctorDistrict: '',
    mpId: '',
    projectId: '',
    amount: 0,
    date: '',
    status: 'active' as 'active' | 'completed' | 'cancelled',
    expectedReturn: 0,
    notes: '',
    products: [] as { productName: string; amount: number }[]
  });

  // AI тавсияларни генерация қилиш
  const generateAIRecommendations = () => {
    const recs: AIRecommendation[] = [];
    const products = [
      { name: 'Амаредетрим', base: 150000 },
      { name: 'Ферсикард', base: 200000 },
      { name: 'Долмасто', base: 180000 },
      { name: 'Репродуктол', base: 250000 },
      { name: 'Кардио-препарат', base: 300000 },
      { name: 'Нейро-препарат', base: 280000 }
    ];

    doctors.forEach((doctor, index) => {
      // Фойдали врачларга кўпроқ инвестиция
      const isProfitable = doctor.debtStatus === 'profit';
      const multiplier = isProfitable ? 1.5 : 0.5;
      
      // Ҳар бир врачга 1-3 та препарат тавсия
      const count = 1 + (index % 3);
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < count && i < shuffled.length; i++) {
        const product = shuffled[i];
        const amount = Math.round((product.base * (0.5 + Math.random() * 0.5)) * multiplier / 100000) * 100000;
        
        if (amount > 100000) {
          recs.push({
            doctorId: doctor.id,
            doctorName: doctor.name,
            doctorRegion: doctor.region || '',
            doctorDistrict: doctor.district || '',
            productName: product.name,
            recommendedAmount: amount,
            reason: isProfitable ? 'Фойдали врач, инвестицияни ошириш тавсия этилади' : 'Кузатишдаги врач',
            priority: isProfitable ? 'high' : 'medium'
          });
        }
      }
    });

    setAIRecommendations(recs.slice(0, 15));
  };

  useEffect(() => {
    const demoDoctors: Doctor[] = [
      { id: '1', name: 'Алимов Али', phone: '+998901234567', region: 'Тошкент', district: 'Чилонзор', totalInvestment: 5000000, totalCommission: 8000000, debt: -3000000, debtStatus: 'profit' },
      { id: '2', name: 'Тангриберганова Дилдора', phone: '+998902345678', region: 'Тошкент', district: 'Яккасарой', totalInvestment: 3000000, totalCommission: 5000000, debt: -2000000, debtStatus: 'profit' },
      { id: '3', name: 'Ибрагимов Гани', phone: '+998903456789', region: 'Тошкент', district: 'Миробод', totalInvestment: 4000000, totalCommission: 3000000, debt: 1000000, debtStatus: 'debt' },
      { id: '4', name: 'Каримова Нигора', phone: '+998905678901', region: 'Самарқанд', district: 'Самарқанд ш.', totalInvestment: 4000000, totalCommission: 7000000, debt: -3000000, debtStatus: 'profit' },
    ];
    setDoctors(demoDoctors);
    setLoading(false);
    generateAIRecommendations();
  }, []);

  // AI тавсияни қабул қилиш
  const acceptAIRecommendation = (rec: AIRecommendation) => {
    const doctor = doctors.find(d => d.id === rec.doctorId);
    if (!doctor) return;

    setSelectedDoctor(rec.doctorId);
    setManualProducts([{ productName: rec.productName, amount: rec.recommendedAmount }]);
    setActiveTab('manual');
  };

  // Қўлда инвестиция қўшиш
  const handleAddManualInvestment = () => {
    if (!selectedDoctor || manualProducts.length === 0) {
      alert('Врач ва камида 1 та препарат киритинг!');
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctor);
    const totalAmount = manualProducts.reduce((sum, p) => sum + p.amount, 0);
    const validProducts = manualProducts.filter(p => p.productName && p.amount > 0);

    if (validProducts.length === 0) {
      alert('Ҳеч қандай препарат киритилмаган!');
      return;
    }

    const newInvestment: Investment = {
      id: Date.now().toString(),
      doctorId: selectedDoctor,
      doctorName: doctor?.name || '',
      doctorPhone: doctor?.phone || '',
      doctorRegion: doctor?.region || '',
      doctorDistrict: doctor?.district || '',
      mpId: user?.id || '',
      projectId: 'proj1',
      amount: totalAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      products: validProducts,
      expectedReturn: totalAmount * 1.2,
      notes: 'Қўлда киритилган',
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setInvestments([...investments, newInvestment]);
    setManualProducts([{ productName: '', amount: 0 }]);
    setSelectedDoctor('');
    alert('Инвестиция сақланди!');
    generateAIRecommendations();
  };

  const addManualProductRow = () => {
    setManualProducts([...manualProducts, { productName: '', amount: 0 }]);
  };

  const removeManualProductRow = (index: number) => {
    if (manualProducts.length > 1) {
      setManualProducts(manualProducts.filter((_, i) => i !== index));
    }
  };

  const updateManualProduct = (index: number, field: 'productName' | 'amount', value: string | number) => {
    const newProducts = [...manualProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setManualProducts(newProducts);
  };

  // Excel импорт
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const importedInvestments: Investment[] = [];

        jsonData.forEach((row: any) => {
          const doctorName = row['Ф.И.О. врача'] || row['ФИО врача'] || '';
          const doctorRegion = row['Область (регион)'] || row['Вилоят'] || '';
          const doctorDistrict = row['Район'] || row['Туман'] || '';
          const totalAmount = Number(row['Общая сумма'] || row['Жами сумма'] || 0);
          const date = row['Дата'] || row['Сана'] || new Date().toISOString().split('T')[0];
          const group = row['Группа'] || row['Гуруҳ'] || '';
          const mpName = row['Медицинский представитель'] || row['MP'] || '';
          const doctorId = String(row['ID врача'] || row['Doc ID'] || Date.now().toString());

          // Препаратларни йиғиш
          const products: { productName: string; amount: number }[] = [];
          for (let i = 1; i <= 10; i++) {
            const productName = row['Препарат_' + i] || '';
            const amount = Number(row['Сумма_' + i] || 0);
            if (productName && amount > 0) {
              products.push({ productName, amount });
            }
          }

          if (doctorName && totalAmount > 0) {
            importedInvestments.push({
              id: Date.now().toString() + '_' + importedInvestments.length,
              doctorId: doctorId,
              doctorName: doctorName,
              doctorPhone: row['Номер телефона'] || row['Телефон'] || '',
              doctorRegion: doctorRegion,
              doctorDistrict: doctorDistrict,
              mpId: mpName,
              projectId: 'proj1',
              amount: totalAmount,
              date: date,
              status: 'active',
              products: products.length > 0 ? products : [{ productName: 'Аниқланмаган', amount: totalAmount }],
              expectedReturn: totalAmount * 1.2,
              notes: row['Примечания'] || row['Изоҳ'] || 'Импорт қилинган',
              createdBy: user?.id || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });

        if (importedInvestments.length > 0) {
          setInvestments([...investments, ...importedInvestments]);
          alert(importedInvestments.length + ' та инвестиция импорт қилинди!');
          generateAIRecommendations();
        } else {
          alert('Файлда инвестициялар топилмади!');
        }
      } catch (error) {
        alert('Файлни ўқишда хатолик: ' + error);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Excel экспорт (AI учун)
  const handleAIExport = () => {
    const data = aiRecommendations.map((rec, index) => ({
      '№': index + 1,
      'Врач': rec.doctorName,
      'Вилоят': rec.doctorRegion,
      'Туман': rec.doctorDistrict,
      'Препарат': rec.productName,
      'Тавсия этилган сумма': rec.recommendedAmount,
      'Сабаб': rec.reason,
      'Устуворлик': rec.priority === 'high' ? 'Юқори' : rec.priority === 'medium' ? 'Ўрта' : 'Паст'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'AI Тавсиялар');
    XLSX.writeFile(wb, 'ai_инвестиция_тавсиялари_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // Excel экспорт (Қўлда)
  const handleManualExport = () => {
    const total = manualProducts.reduce((sum, p) => sum + p.amount, 0);
    const data = manualProducts.filter(p => p.productName).map((p, index) => ({
      '№': index + 1,
      'Врач': doctors.find(d => d.id === selectedDoctor)?.name || '',
      'Препарат': p.productName,
      'Сумма': p.amount,
      'Жами': total
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Қўлда инвестиция');
    XLSX.writeFile(wb, 'кулда_инвестиция_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // Excel экспорт (Рўйхат)
  const handleListExport = () => {
    const data = filteredInvestments.map((inv, index) => ({
      '№': index + 1,
      'Врач': inv.doctorName,
      'Телефон': inv.doctorPhone,
      'Вилоят': inv.doctorRegion,
      'Туман': inv.doctorDistrict,
      'Сумма': inv.amount,
      'Сана': inv.date,
      'Ҳолат': inv.status,
      'Препаратлар': inv.products.map(p => p.productName + ' (' + p.amount.toLocaleString() + ' сўм)').join('; '),
      'ROI': inv.roi ? inv.roi.toFixed(1) + '%' : '0%',
      'Изоҳ': inv.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Инвестициялар');
    XLSX.writeFile(wb, 'инвестициялар_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // Шаблонни юклаш
  const downloadTemplate = () => {
    const template = [
      ['Область (регион)', 'Район', 'Ф.И.О. врача', 'ЛПУ', 'Район врача', 'Специальность', 'Номер телефона', 'Номер карты', 'Медицинский представитель', 'Группа', 'Форма', 'Общая сумма', 'Препарат_1', 'Сумма_1', 'Препарат_2', 'Сумма_2', 'Препарат_3', 'Сумма_3', 'Препарат_4', 'Сумма_4', 'Примечания', 'ID врача', 'ID Мп', 'IDРМ', 'ФИО врача', 'Doc ID'],
      ['Тошкент', 'Чилонзор', 'Алимов Али', '1-поликлиника', 'Чилонзор', 'Терапевт', '998901234567', '8600123456789012', 'Юлдашев Исломбек', 'Forte', 'карта', '500000', 'Амаредетрим', '500000', '', '', '', '', '', '', 'Тест', '1', '0', '0', 'Алимов Али', '1']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Инвестиция шаблони');
    XLSX.writeFile(wb, 'инвестиция_шаблони.xlsx');
  };

  const filteredInvestments = investments.filter(inv => {
    const matchSearch = inv.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedPeriod === 'all' || inv.status === selectedPeriod;
    return matchSearch && matchStatus;
  });

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReturn = investments.reduce((sum, inv) => sum + (inv.actualReturn || 0), 0);
  const avgRoi = investments.length > 0 ? (totalReturn - totalInvested) / totalInvested * 100 : 0;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; bg: string }> = {
      active: { color: '#2ecc71', label: '🟢 Фаол', bg: '#d4edda' },
      completed: { color: '#3498db', label: '✅ Тугалланган', bg: '#cce5ff' },
      cancelled: { color: '#e74c3c', label: '❌ Бекор қилинган', bg: '#f8d7da' }
    };
    const badge = badges[status] || badges.active;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', background: badge.bg, color: badge.color, fontSize: '12px', fontWeight: 'bold' }}>{badge.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, { bg: string; color: string; label: string }> = {
      high: { bg: '#fef2f2', color: '#dc2626', label: '🔴 Юқори' },
      medium: { bg: '#fffbeb', color: '#d97706', label: '🟡 Ўрта' },
      low: { bg: '#eff6ff', color: '#2563eb', label: '🔵 Паст' }
    };
    const style = colors[priority] || colors.medium;
    return <span style={{ padding: '2px 8px', borderRadius: '4px', background: style.bg, color: style.color, fontSize: '11px', fontWeight: 'bold' }}>{style.label}</span>;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>💵 Инвестициялар</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📄 Шаблон юклаш</button>
        </div>
      </div>

      {/* Таблар */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e8ecf1', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('ai')} style={{ padding: '10px 20px', background: activeTab === 'ai' ? '#764ba2' : 'transparent', color: activeTab === 'ai' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'ai' ? 'bold' : 'normal' }}>
          🤖 AI тавсиялар
        </button>
        <button onClick={() => setActiveTab('manual')} style={{ padding: '10px 20px', background: activeTab === 'manual' ? '#667eea' : 'transparent', color: activeTab === 'manual' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'manual' ? 'bold' : 'normal' }}>
          ✍️ Қўлда киритиш
        </button>
        <button onClick={() => setActiveTab('import')} style={{ padding: '10px 20px', background: activeTab === 'import' ? '#2ecc71' : 'transparent', color: activeTab === 'import' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'import' ? 'bold' : 'normal' }}>
          📥 Excel импорт
        </button>
        <button onClick={() => setActiveTab('list')} style={{ padding: '10px 20px', background: activeTab === 'list' ? '#3498db' : 'transparent', color: activeTab === 'list' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'list' ? 'bold' : 'normal' }}>
          📋 Рўйхат
        </button>
      </div>

      {/* ===== 1-ҚИСМ: AI тавсиялар ===== */}
      {activeTab === 'ai' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>🤖 AI инвестиция тавсиялари</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={generateAIRecommendations} style={{ padding: '8px 16px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔄 Янгилаш</button>
              <button onClick={handleAIExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📤 Экспорт</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
            {aiRecommendations.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#999' }}>Ҳеч қандай AI тавсия йўқ</div>
            ) : (
              aiRecommendations.map((rec, index) => (
                <div key={index} style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  borderLeft: rec.priority === 'high' ? '4px solid #2ecc71' : rec.priority === 'medium' ? '4px solid #f39c12' : '4px solid #3498db'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{rec.doctorName}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>{rec.doctorRegion}, {rec.doctorDistrict}</div>
                      <div style={{ fontSize: '14px', color: '#333', marginTop: '6px' }}>
                        💊 {rec.productName} - <strong>{rec.recommendedAmount.toLocaleString()} сўм</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{rec.reason}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {getPriorityBadge(rec.priority)}
                      <button onClick={() => acceptAIRecommendation(rec)} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        ✅ Қабул қилиш
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== 2-ҚИСМ: Қўлда киритиш ===== */}
      {activeTab === 'manual' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 12px' }}>✍️ Қўлда инвестиция киритиш</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Врач танланг *</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="">Танланг</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>💊 Препаратлар ва суммалар</div>
              {manualProducts.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => updateManualProduct(index, 'productName', e.target.value)}
                    placeholder="Препарат номи"
                    style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateManualProduct(index, 'amount', Number(e.target.value) || 0)}
                    placeholder="Сумма"
                    style={{ width: '150px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  {manualProducts.length > 1 && (
                    <button onClick={() => removeManualProductRow(index)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addManualProductRow} style={{ padding: '4px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>➕ Яна препарат</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={handleAddManualInvestment} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Сақлаш</button>
              <button onClick={handleManualExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📤 Экспорт</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3-ҚИСМ: Excel импорт ===== */}
      {activeTab === 'import' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 12px' }}>📥 Excel импорт</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ойни танланг</label>
                <input type="month" value={importMonth} onChange={(e) => setImportMonth(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Excel файл</label>
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              📌 Файл формати: <strong>инвестиция_шаблони.xlsx</strong> даги каби бўлиши керак
            </div>
            <button onClick={downloadTemplate} style={{ marginTop: '10px', padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📄 Шаблон юклаш</button>
          </div>
        </div>
      )}

      {/* ===== 4-ҚИСМ: Рўйхат ===== */}
      {activeTab === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Қидириш..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setSelectedPeriod('all')} style={{ padding: '4px 12px', background: selectedPeriod === 'all' ? '#667eea' : '#e8ecf1', color: selectedPeriod === 'all' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📋 Барчаси</button>
                <button onClick={() => setSelectedPeriod('active')} style={{ padding: '4px 12px', background: selectedPeriod === 'active' ? '#667eea' : '#e8ecf1', color: selectedPeriod === 'active' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🟢 Фаол</button>
                <button onClick={() => setSelectedPeriod('completed')} style={{ padding: '4px 12px', background: selectedPeriod === 'completed' ? '#667eea' : '#e8ecf1', color: selectedPeriod === 'completed' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✅ Тугалланган</button>
              </div>
            </div>
            <button onClick={handleListExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          </div>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
              <div style={{ fontSize: '11px', color: '#666' }}>📊 Жами инвестиция</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>{totalInvested.toLocaleString()} сўм</div>
            </div>
            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
              <div style={{ fontSize: '11px', color: '#666' }}>💰 Жами даромад</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2ecc71' }}>{totalReturn.toLocaleString()} сўм</div>
            </div>
            <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
              <div style={{ fontSize: '11px', color: '#666' }}>📈 Ўртача ROI</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: avgRoi >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {avgRoi.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Жадвал */}
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>№</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Врач</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Сумма</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Сана</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳолат</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Препаратлар</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>ROI</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳаракатлар</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestments.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай инвестиция топилмади</td></tr>
                  ) : (
                    filteredInvestments.map((inv, index) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{inv.doctorName}</td>
                        <td style={{ padding: '10px 14px' }}>{inv.amount.toLocaleString()} сўм</td>
                        <td style={{ padding: '10px 14px' }}>{inv.date}</td>
                        <td style={{ padding: '10px 14px' }}>{getStatusBadge(inv.status)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                          {inv.products.map(p => p.productName).join(', ')}
                        </td>
                        <td style={{ padding: '10px 14px', color: inv.roi && inv.roi > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                          {inv.roi ? inv.roi.toFixed(1) + '%' : '0%'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => {}} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                          <button onClick={() => {}} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
