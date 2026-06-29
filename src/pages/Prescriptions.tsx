import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface Prescription {
  id: string;
  doctorId?: string;
  doctorName: string;
  doctorPhone: string;
  doctorRegion?: string;
  doctorDistrict?: string;
  receiptNumber: string;
  drugName: string;
  drugAmount: number;
  drugPrice: number;
  totalAmount: number;
  printedAt: string;
  createdAt: string;
  source: 'fom' | 'manual';
  status: 'active' | 'used' | 'expired' | 'cancelled';
  notes?: string;
  createdBy: string;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  region: string;
  district: string;
}

const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [printReceipt, setPrintReceipt] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    doctorPhone: '',
    doctorRegion: '',
    doctorDistrict: '',
    receiptNumber: '',
    drugName: '',
    drugAmount: 1,
    drugPrice: 0,
    totalAmount: 0,
    printedAt: '',
    source: 'manual' as 'fom' | 'manual',
    status: 'active' as 'active' | 'used' | 'expired' | 'cancelled',
    notes: ''
  });

  useEffect(() => {
    const demoDoctors: Doctor[] = [
      { id: '1', name: 'Алимов Али', phone: '+998901234567', region: 'Тошкент', district: 'Чилонзор' },
      { id: '2', name: 'Тангриберганова Дилдора', phone: '+998902345678', region: 'Тошкент', district: 'Яккасарой' },
      { id: '3', name: 'Ибрагимов Гани', phone: '+998903456789', region: 'Тошкент', district: 'Миробод' },
    ];
    setDoctors(demoDoctors);

    const demoPrescriptions: Prescription[] = [
      {
        id: '1',
        doctorId: '1',
        doctorName: 'Алимов Али',
        doctorPhone: '+998901234567',
        doctorRegion: 'Тошкент',
        doctorDistrict: 'Чилонзор',
        receiptNumber: 'FOM-2026-001',
        drugName: 'Амаредетрим',
        drugAmount: 3,
        drugPrice: 150000,
        totalAmount: 450000,
        printedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        source: 'fom',
        status: 'active',
        notes: '',
        createdBy: '1'
      },
      {
        id: '2',
        doctorId: '2',
        doctorName: 'Тангриберганова Дилдора',
        doctorPhone: '+998902345678',
        doctorRegion: 'Тошкент',
        doctorDistrict: 'Яккасарой',
        receiptNumber: 'MAN-2026-001',
        drugName: 'Ферсикард',
        drugAmount: 2,
        drugPrice: 200000,
        totalAmount: 400000,
        printedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        source: 'manual',
        status: 'used',
        notes: 'Беморга берилди',
        createdBy: '1'
      }
    ];
    setPrescriptions(demoPrescriptions);
    setLoading(false);
  }, []);

  const filteredPrescriptions = prescriptions.filter(p => {
    const matchSearch = 
      p.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.drugName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAddPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const newPrescription: Prescription = {
      id: Date.now().toString(),
      ...formData,
      totalAmount: formData.drugAmount * formData.drugPrice,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || ''
    };
    setPrescriptions([...prescriptions, newPrescription]);
    setShowModal(false);
    resetForm();
    alert('Рецепт сақланди!');
  };

  const handleEdit = (prescription: Prescription) => {
    setEditingId(prescription.id);
    setFormData({
      doctorId: prescription.doctorId || '',
      doctorName: prescription.doctorName,
      doctorPhone: prescription.doctorPhone,
      doctorRegion: prescription.doctorRegion || '',
      doctorDistrict: prescription.doctorDistrict || '',
      receiptNumber: prescription.receiptNumber,
      drugName: prescription.drugName,
      drugAmount: prescription.drugAmount,
      drugPrice: prescription.drugPrice,
      totalAmount: prescription.totalAmount,
      printedAt: prescription.printedAt,
      source: prescription.source,
      status: prescription.status,
      notes: prescription.notes || ''
    });
    setShowModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setPrescriptions(prescriptions.map(p =>
      p.id === editingId ? {
        ...p,
        ...formData,
        totalAmount: formData.drugAmount * formData.drugPrice,
        updatedAt: new Date().toISOString()
      } : p
    ));
    setEditingId(null);
    setShowModal(false);
    resetForm();
    alert('Рецепт янгиланди!');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Ушбу рецептни ўчирамизми?')) return;
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const handlePrint = (id: string) => {
    setPrintReceipt(id);
    // Принт ойнасини очиш
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    const prescription = prescriptions.find(p => p.id === id);
    if (printWindow && prescription) {
      printWindow.document.write(
        <html>
          <head><title>Рецепт №</title></head>
          <body style="font-family: Arial; padding: 20px;">
            <h2 style="text-align: center;">🏥 MedHelper CRM</h2>
            <h3 style="text-align: center;">ЭЛЕКТРОН РЕЦЕПТ</h3>
            <hr/>
            <p><strong>Рецепт №:</strong> </p>
            <p><strong>Врач:</strong> </p>
            <p><strong>Телефон:</strong> </p>
            <p><strong>Препарат:</strong> </p>
            <p><strong>Миқдор:</strong>  дона</p>
            <p><strong>Нархи:</strong>  сўм</p>
            <p><strong>Жами:</strong>  сўм</p>
            <p><strong>Сана:</strong> </p>
            <hr/>
            <p style="text-align: center; color: #666; font-size: 12px;">MedHelper CRM v8.0 | </p>
          </body>
        </html>
      );
      printWindow.document.close();
      printWindow.print();
    }
    setPrintReceipt(null);
  };

  const resetForm = () => {
    setFormData({
      doctorId: '', doctorName: '', doctorPhone: '', doctorRegion: '', doctorDistrict: '',
      receiptNumber: '', drugName: '', drugAmount: 1, drugPrice: 0, totalAmount: 0,
      printedAt: '', source: 'manual', status: 'active', notes: ''
    });
  };

  // Excel экспорт
  const handleExport = () => {
    const data = filteredPrescriptions.map((p, index) => ({
      '№': index + 1,
      'Врач': p.doctorName,
      'Телефон': p.doctorPhone,
      'Рецепт №': p.receiptNumber,
      'Препарат': p.drugName,
      'Миқдор': p.drugAmount,
      'Нархи': p.drugPrice,
      'Жами': p.totalAmount,
      'Сана': p.printedAt,
      'Манба': p.source === 'fom' ? 'FOM' : 'Қўлда',
      'Ҳолат': p.status,
      'Изоҳ': p.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Рецептлар');
    XLSX.writeFile(wb, 'рецептлар_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // FOM интеграция (симуляция)
  const handleFOMImport = () => {
    const fomData = [
      { receiptNumber: 'FOM-2026-002', doctorName: 'Алимов Али', drugName: 'Долмасто', quantity: 2, price: 180000, printedAt: new Date().toISOString().split('T')[0] },
      { receiptNumber: 'FOM-2026-003', doctorName: 'Тангриберганова Дилдора', drugName: 'Репродуктол', quantity: 1, price: 250000, printedAt: new Date().toISOString().split('T')[0] }
    ];

    const imported = fomData.map((item, index) => ({
      id: 'fom_' + Date.now() + '_' + index,
      doctorId: '',
      doctorName: item.doctorName,
      doctorPhone: doctors.find(d => d.name === item.doctorName)?.phone || '',
      doctorRegion: doctors.find(d => d.name === item.doctorName)?.region || '',
      doctorDistrict: doctors.find(d => d.name === item.doctorName)?.district || '',
      receiptNumber: item.receiptNumber,
      drugName: item.drugName,
      drugAmount: item.quantity,
      drugPrice: item.price,
      totalAmount: item.quantity * item.price,
      printedAt: item.printedAt,
      createdAt: new Date().toISOString(),
      source: 'fom' as 'fom',
      status: 'active' as 'active',
      notes: 'FOM дан импорт қилинди',
      createdBy: user?.id || ''
    }));

    setPrescriptions([...prescriptions, ...imported]);
    alert(imported.length + ' та рецепт FOM дан импорт қилинди!');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; bg: string }> = {
      active: { color: '#2ecc71', label: '🟢 Фаол', bg: '#d4edda' },
      used: { color: '#3498db', label: '📋 Ишлатилган', bg: '#cce5ff' },
      expired: { color: '#e74c3c', label: '⏰ Муддати ўтган', bg: '#f8d7da' },
      cancelled: { color: '#f39c12', label: '❌ Бекор қилинган', bg: '#fff3cd' }
    };
    const badge = badges[status] || badges.active;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', background: badge.bg, color: badge.color, fontSize: '12px', fontWeight: 'bold' }}>{badge.label}</span>;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>📋 Рецептлар ({prescriptions.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="all">📋 Барчаси</option>
            <option value="active">🟢 Фаол</option>
            <option value="used">📋 Ишлатилган</option>
            <option value="expired">⏰ Муддати ўтган</option>
            <option value="cancelled">❌ Бекор қилинган</option>
          </select>
          <button
            onClick={handleFOMImport}
            style={{ padding: '8px 16px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📥 FOM импорт
          </button>
          <button
            onClick={handleExport}
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📤 Экспорт
          </button>
          <button
            onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ➕ Рецепт қўшиш
          </button>
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
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Рецепт №</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Препарат</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Жами</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Манба</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳолат</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳаракатлар</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай рецепт топилмади</td></tr>
              ) : (
                filteredPrescriptions.map((p, index) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{p.doctorName}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{p.receiptNumber}</td>
                    <td style={{ padding: '10px 14px' }}>{p.drugName}</td>
                    <td style={{ padding: '10px 14px' }}>{p.totalAmount.toLocaleString()} сўм</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: p.source === 'fom' ? '#d4edda' : '#fff3cd', fontSize: '12px' }}>
                        {p.source === 'fom' ? '📋 FOM' : '✏️ Қўлда'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{getStatusBadge(p.status)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handlePrint(p.id)} style={{ padding: '4px 8px', background: '#d4edda', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>🖨️</button>
                      <button onClick={() => handleEdit(p)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модал ойна */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Рецептни таҳрирлаш' : '➕ Янги рецепт қўшиш'}</h3>
            <form onSubmit={editingId ? handleUpdate : handleAddPrescription}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Врач</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => {
                    const doctor = doctors.find(d => d.id === e.target.value);
                    if (doctor) {
                      setFormData({ ...formData, doctorId: doctor.id, doctorName: doctor.name, doctorPhone: doctor.phone, doctorRegion: doctor.region, doctorDistrict: doctor.district });
                    }
                  }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Танланг</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Рецепт рақами *</label>
                <input type="text" value={formData.receiptNumber} onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Препарат *</label>
                  <input type="text" value={formData.drugName} onChange={(e) => setFormData({...formData, drugName: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Миқдор *</label>
                  <input type="number" value={formData.drugAmount} onChange={(e) => setFormData({...formData, drugAmount: Number(e.target.value)})} required min="1" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Нархи (сўм) *</label>
                  <input type="number" value={formData.drugPrice} onChange={(e) => setFormData({...formData, drugPrice: Number(e.target.value)})} required min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Сана *</label>
                  <input type="date" value={formData.printedAt} onChange={(e) => setFormData({...formData, printedAt: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Манба</label>
                  <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value as any})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="manual">✏️ Қўлда</option>
                    <option value="fom">📋 FOM</option>
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="active">🟢 Фаол</option>
                    <option value="used">📋 Ишлатилган</option>
                    <option value="expired">⏰ Муддати ўтган</option>
                    <option value="cancelled">❌ Бекор қилинган</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Изоҳ</label>
                <input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                💰 Жами: {(formData.drugAmount * formData.drugPrice).toLocaleString()} сўм
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); resetForm(); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
