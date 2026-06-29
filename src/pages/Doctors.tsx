import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { REGIONS_DATA, SPECIALITIES } from '../utils/regions';

interface Doctor {
  id: string;
  name: string;
  phone: string;
  speciality: string;
  workplace: string;
  cardNumber: string;
  cardHolder?: string;
  region: string;
  district: string;
  mpId: string;
  projectId: string;
  telegramId?: string;
  birthdate?: string;
  prescriptionCount: number;
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
  aiScore: number;
  aiGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  isActive: boolean;
  createdAt: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const Doctors: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    speciality: '',
    workplace: '',
    cardNumber: '',
    cardHolder: '',
    region: '',
    district: '',
    mpId: '',
    projectId: '',
    telegramId: '',
    birthdate: ''
  });
  const [districts, setDistricts] = useState<string[]>([]);

  // Устунлар конфигурацияси
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'id', label: '№', visible: true },
    { key: 'name', label: 'Исм', visible: true },
    { key: 'speciality', label: 'Мутахассислик', visible: true },
    { key: 'workplace', label: 'Иш жойи', visible: true },
    { key: 'region', label: 'Вилоят', visible: true },
    { key: 'district', label: 'Туман', visible: true },
    { key: 'phone', label: 'Телефон', visible: false },
    { key: 'cardNumber', label: 'Карта рақами', visible: false },
    { key: 'cardHolder', label: 'Карта эгаси', visible: false },
    { key: 'telegramId', label: 'Telegram', visible: false },
    { key: 'birthdate', label: 'Туғ. куни', visible: false },
    { key: 'debt', label: 'Қарз (сўм)', visible: true },
    { key: 'ai', label: 'AI', visible: true },
    { key: 'actions', label: 'Ҳаракатлар', visible: true },
  ]);

  // Вилоят танланганда туманларни янгилаш
  const handleRegionChange = (region: string) => {
    setFormData({ ...formData, region, district: '' });
    setDistricts(REGIONS_DATA[region as keyof typeof REGIONS_DATA] || []);
  };

  // Устунни кўрсатиш/яшириш
  const toggleColumn = (key: string) => {
    setColumns(columns.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  // Қарзни ҳисоблаш
  const calculateDebt = (totalInvestment: number, totalCommission: number) => {
    const debt = totalInvestment - totalCommission;
    let debtStatus: 'debt' | 'profit' | 'zero';
    if (debt > 0) debtStatus = 'debt';
    else if (debt < 0) debtStatus = 'profit';
    else debtStatus = 'zero';
    return { debt, debtStatus };
  };

  // Қарзни кўрсатиш
  const getDebtDisplay = (debt: number, debtStatus: string) => {
    if (debtStatus === 'debt') {
      return {
        text: '-' + debt.toLocaleString(),
        color: '#e74c3c',
        status: 'Қарз'
      };
    } else if (debtStatus === 'profit') {
      return {
        text: Math.abs(debt).toLocaleString(),
        color: '#2ecc71',
        status: 'Фойда'
      };
    } else {
      return {
        text: '0',
        color: '#f39c12',
        status: 'Тенг'
      };
    }
  };

  const getDebtBackground = (debtStatus: string) => {
    const colors: Record<string, string> = {
      debt: '#fde2e2',
      profit: '#d4edda',
      zero: '#fff3cd'
    };
    return colors[debtStatus] || '#f8f9fa';
  };

  // Экспорт (Excel)
  const handleExport = () => {
    const data = filteredDoctors.map((doc, index) => ({
      '№': index + 1,
      'Исм': doc.name,
      'Телефон': doc.phone,
      'Мутахассислик': doc.speciality || '-',
      'Иш жойи': doc.workplace || '-',
      'Карта рақами': doc.cardNumber || '-',
      'Карта эгаси': doc.cardHolder || '-',
      'Telegram ID': doc.telegramId || '-',
      'Туғилган куни': doc.birthdate || '-',
      'Вилоят': doc.region || '-',
      'Туман': doc.district || '-',
      'Инвестиция (сўм)': doc.totalInvestment || 0,
      'Комиссия (сўм)': doc.totalCommission || 0,
      'Қарз (сўм)': doc.debtStatus === 'debt' ? '-' + doc.debt : doc.debt,
      'Қарз ҳолати': doc.debtStatus === 'debt' ? 'Қарз' : doc.debtStatus === 'profit' ? 'Фойда' : 'Тенг',
      'AI рейтинг': doc.aiGrade || 'E',
      'AI балл': doc.aiScore || 0
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 12 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Врачлар');
    XLSX.writeFile(wb, 'врачлар_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // Импорт (Excel)
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

        const importedDoctors: Doctor[] = [];
        jsonData.forEach((row: any, index: number) => {
          const name = row['Исм'] || row['Ф.И.О'] || row['Name'] || '';
          const phone = String(row['Телефон'] || row['Phone'] || '').replace(/\s/g, '');
          
          if (name && phone) {
            const investment = Number(row['Инвестиция (сўм)'] || row['Investment'] || 0);
            const commission = Number(row['Комиссия (сўм)'] || row['Commission'] || 0);
            const { debt, debtStatus } = calculateDebt(investment, commission);
            
            importedDoctors.push({
              id: Date.now().toString() + index,
              name: name,
              phone: phone,
              speciality: row['Мутахассислик'] || row['Speciality'] || '',
              workplace: row['Иш жойи'] || row['Workplace'] || '',
              cardNumber: String(row['Карта рақами'] || row['CardNumber'] || '').replace(/\s/g, ''),
              cardHolder: row['Карта эгаси'] || row['CardHolder'] || '',
              region: row['Вилоят'] || row['Region'] || '',
              district: row['Туман'] || row['District'] || '',
              mpId: '',
              projectId: '',
              telegramId: row['Telegram ID'] || row['TelegramId'] || '',
              birthdate: row['Туғилган куни'] || row['Birthdate'] || '',
              prescriptionCount: 0,
              totalInvestment: investment,
              totalCommission: commission,
              debt: debt,
              debtStatus: debtStatus,
              aiScore: Number(row['AI балл'] || row['AIScore'] || 0),
              aiGrade: (row['AI рейтинг'] || row['AIGrade'] || 'E') as 'A' | 'B' | 'C' | 'D' | 'E',
              isActive: true,
              createdAt: new Date().toISOString()
            });
          }
        });

        if (importedDoctors.length > 0) {
          setDoctors([...doctors, ...importedDoctors]);
          alert(importedDoctors.length + ' та врач импорт қилинди!');
        } else {
          alert('Файлда врачлар топилмади');
        }
      } catch (error) {
        alert('Файлни ўқишда хатолик юз берди.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  useEffect(() => {
    const demoDoctors: Doctor[] = [
      {
        id: '1',
        name: 'Алимов Али',
        phone: '+998901234567',
        speciality: 'Терапевт',
        workplace: '1-поликлиника',
        cardNumber: '8600123456789012',
        cardHolder: 'Алимов Али',
        region: 'Тошкент',
        district: 'Чилонзор',
        mpId: 'mp1',
        projectId: 'proj1',
        telegramId: '@alimov_ali',
        birthdate: '1985-05-15',
        prescriptionCount: 15,
        totalInvestment: 5000000,
        totalCommission: 3000000,
        debt: 0,
        debtStatus: 'debt',
        aiScore: 95,
        aiGrade: 'A',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Тангриберганова Дилдора',
        phone: '+998902345678',
        speciality: 'Кардиолог',
        workplace: '2-поликлиника',
        cardNumber: '8600234567890123',
        cardHolder: 'Тангриберганова Д.',
        region: 'Тошкент',
        district: 'Яккасарой',
        mpId: 'mp1',
        projectId: 'proj1',
        telegramId: '@dildora_t',
        birthdate: '1990-08-22',
        prescriptionCount: 10,
        totalInvestment: 3000000,
        totalCommission: 5000000,
        debt: 0,
        debtStatus: 'profit',
        aiScore: 82,
        aiGrade: 'B',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Ибрагимов Гани',
        phone: '+998903456789',
        speciality: 'Невропотолог',
        workplace: '3-поликлиника',
        cardNumber: '8600345678901234',
        cardHolder: 'Ибрагимов Гани',
        region: 'Тошкент',
        district: 'Миробод',
        mpId: 'mp1',
        projectId: 'proj1',
        telegramId: '',
        birthdate: '',
        prescriptionCount: 5,
        totalInvestment: 4000000,
        totalCommission: 4000000,
        debt: 0,
        debtStatus: 'zero',
        aiScore: 60,
        aiGrade: 'C',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    const doctorsWithDebt = demoDoctors.map(doc => {
      const { debt, debtStatus } = calculateDebt(doc.totalInvestment, doc.totalCommission);
      return { ...doc, debt, debtStatus };
    });

    setDoctors(doctorsWithDebt);
    setLoading(false);
  }, []);

  const filteredDoctors = doctors.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.phone.includes(searchTerm) ||
    doc.speciality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.telegramId && doc.telegramId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoctor: Doctor = {
      id: Date.now().toString(),
      ...formData,
      prescriptionCount: 0,
      totalInvestment: 0,
      totalCommission: 0,
      debt: 0,
      debtStatus: 'zero',
      aiScore: 0,
      aiGrade: 'E',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setDoctors([...doctors, newDoctor]);
    setShowModal(false);
    setFormData({ name: '', phone: '', speciality: '', workplace: '', cardNumber: '', cardHolder: '', region: '', district: '', mpId: '', projectId: '', telegramId: '', birthdate: '' });
    setDistricts([]);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Ушбу врачни ўчирамизми?')) return;
    setDoctors(doctors.filter(doc => doc.id !== id));
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingId(doctor.id);
    setFormData({
      name: doctor.name,
      phone: doctor.phone,
      speciality: doctor.speciality || '',
      workplace: doctor.workplace || '',
      cardNumber: doctor.cardNumber || '',
      cardHolder: doctor.cardHolder || '',
      region: doctor.region || '',
      district: doctor.district || '',
      mpId: doctor.mpId || '',
      projectId: doctor.projectId || '',
      telegramId: doctor.telegramId || '',
      birthdate: doctor.birthdate || ''
    });
    setDistricts(REGIONS_DATA[doctor.region as keyof typeof REGIONS_DATA] || []);
    setShowModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    const updatedDoctors = doctors.map(doc => {
      if (doc.id === editingId) {
        const updated = { ...doc, ...formData };
        const { debt, debtStatus } = calculateDebt(updated.totalInvestment, updated.totalCommission);
        return { ...updated, debt, debtStatus };
      }
      return doc;
    });
    
    setDoctors(updatedDoctors);
    setEditingId(null);
    setShowModal(false);
    setFormData({ name: '', phone: '', speciality: '', workplace: '', cardNumber: '', cardHolder: '', region: '', district: '', mpId: '', projectId: '', telegramId: '', birthdate: '' });
    setDistricts([]);
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: '#2ecc71',
      B: '#3498db',
      C: '#f39c12',
      D: '#e67e22',
      E: '#e74c3c'
    };
    return colors[grade] || '#999';
  };

  // Устунларни рендер қилиш
  const renderColumn = (key: string, doctor: Doctor, index: number) => {
    switch (key) {
      case 'id':
        return <td key={key} style={{ padding: '10px 14px' }}>{index + 1}</td>;
      case 'name':
        return <td key={key} style={{ padding: '10px 14px', fontWeight: 'bold' }}>{doctor.name}</td>;
      case 'speciality':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.speciality || '-'}</td>;
      case 'workplace':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.workplace || '-'}</td>;
      case 'region':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.region || '-'}</td>;
      case 'district':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.district || '-'}</td>;
      case 'phone':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.phone}</td>;
      case 'cardNumber':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.cardNumber || '-'}</td>;
      case 'cardHolder':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.cardHolder || '-'}</td>;
      case 'telegramId':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.telegramId || '-'}</td>;
      case 'birthdate':
        return <td key={key} style={{ padding: '10px 14px' }}>{doctor.birthdate || '-'}</td>;
      case 'debt': {
        const debtInfo = getDebtDisplay(doctor.debt, doctor.debtStatus);
        return (
          <td key={key} style={{ padding: '10px 14px', color: debtInfo.color, fontWeight: 'bold' }}>
            {debtInfo.text}
          </td>
        );
      }
      case 'ai':
        return (
          <td key={key} style={{ padding: '10px 14px' }}>
            <span style={{
              padding: '2px 10px',
              borderRadius: '12px',
              background: getGradeColor(doctor.aiGrade),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {doctor.aiGrade} ({doctor.aiScore}%)
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={key} style={{ padding: '10px 14px' }}>
            <button
              onClick={() => handleEdit(doctor)}
              style={{
                padding: '4px 8px',
                background: '#cce5ff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '4px'
              }}
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(doctor.id)}
              style={{
                padding: '4px 8px',
                background: '#f8d7da',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️
            </button>
          </td>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>👨‍⚕️ Врачлар ({doctors.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              width: '200px'
            }}
          />
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Устунлар
          </button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            style={{ display: 'none' }}
            id="importFile"
          />
          <button
            onClick={() => document.getElementById('importFile')?.click()}
            style={{
              padding: '8px 16px',
              background: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📥 Импорт
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📤 Экспорт
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', phone: '', speciality: '', workplace: '', cardNumber: '', cardHolder: '', region: '', district: '', mpId: '', projectId: '', telegramId: '', birthdate: '' });
              setDistricts([]);
              setShowModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ➕ Врач қўшиш
          </button>
        </div>
      </div>

      {/* Устунлар созламалари */}
      {showColumnSettings && (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '10px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>📋 Устунларни бошқариш</h4>
            <button
              onClick={() => setShowColumnSettings(false)}
              style={{
                padding: '4px 12px',
                background: '#e8ecf1',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ Ёпиш
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {columns.map(col => (
              <label key={col.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: col.visible ? '#667eea20' : '#f0f0f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Статистика */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '12px', 
        marginBottom: '20px' 
      }}>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🔴 Қарз</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
            {doctors.filter(d => d.debtStatus === 'debt').length}
          </div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🟢 Фойда</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2ecc71' }}>
            {doctors.filter(d => d.debtStatus === 'profit').length}
          </div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🟡 Тенг</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
            {doctors.filter(d => d.debtStatus === 'zero').length}
          </div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>📊 Жами қарз</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
            {doctors.reduce((sum, d) => sum + d.debt, 0).toLocaleString()} сўм
          </div>
        </div>
      </div>

      {/* Врачлар жадвали */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                {columns.filter(col => col.visible).map(col => (
                  <th key={col.key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#555' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(c => c.visible).length} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                    Ҳеч қандай врач топилмади
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor, index) => (
                  <tr key={doctor.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {columns.filter(col => col.visible).map(col => (
                      renderColumn(col.key, doctor, index)
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Врачни таҳрирлаш' : '➕ Янги врач қўшиш'}</h3>
            <form onSubmit={editingId ? handleUpdate : handleAddDoctor}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Исм *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Телефон *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Telegram ID</label>
                <input
                  type="text"
                  value={formData.telegramId}
                  onChange={(e) => setFormData({...formData, telegramId: e.target.value})}
                  placeholder="@username"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Туғилган куни</label>
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Мутахассислик</label>
                <select
                  value={formData.speciality}
                  onChange={(e) => setFormData({...formData, speciality: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Танланг</option>
                  {SPECIALITIES.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Иш жойи</label>
                <input
                  type="text"
                  value={formData.workplace}
                  onChange={(e) => setFormData({...formData, workplace: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Карта рақами</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Карта эгаси</label>
                <input
                  type="text"
                  value={formData.cardHolder}
                  onChange={(e) => setFormData({...formData, cardHolder: e.target.value})}
                  placeholder="Карта эгасининг FIO"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Вилоят</label>
                <select
                  value={formData.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Танланг</option>
                  {Object.keys(REGIONS_DATA).map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Туман</label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  disabled={!formData.region}
                >
                  <option value="">Танланг</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: '', phone: '', speciality: '', workplace: '', cardNumber: '', cardHolder: '', region: '', district: '', mpId: '', projectId: '', telegramId: '', birthdate: '' });
                    setDistricts([]);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#e8ecf1',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Бекор қилиш
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editingId ? 'Янгилаш' : 'Сақлаш'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
