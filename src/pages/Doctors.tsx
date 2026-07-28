import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { SPECIALITIES } from '../utils/regions';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { auth } from '../firebase';

interface Doctor {
  id: string;
  name: string;
  phone: string;
  speciality: string;
  workplace: string;
  cardNumber: string;
  cardHolder?: string;
  region: string;
  regionId?: string;
  district: string;
  districtId?: string;
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
  createdAt: any;
  updatedAt?: any;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

interface DistrictData {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  isActive: boolean;
}

const Doctors: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    regionId: '',
    district: '',
    districtId: '',
    mpId: '',
    projectId: '',
    telegramId: '',
    birthdate: ''
  });
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtsData, setDistrictsData] = useState<DistrictData[]>([]);

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

  // ============================================
  // ҚАРЗНИ КЎРСАТИШ
  // ============================================
  const getDebtDisplay = (debt: number, debtStatus: string) => {
    if (debtStatus === 'debt') {
      return {
        text: '-' + Math.abs(debt).toLocaleString(),
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

  // ============================================
  // TUMAN NOMINI NORMALIZE QILISH
  // ============================================
  const normalizeName = (str: string) => {
    if (!str) return '';
    return str
      .replace(/Ҳ/g, 'Х')
      .replace(/ҳ/g, 'х')
      .replace(/Ў/g, 'У')
      .replace(/ў/g, 'у')
      .replace(/Ғ/g, 'Г')
      .replace(/ғ/g, 'г')
      .replace(/Қ/g, 'К')
      .replace(/қ/g, 'к')
      .trim();
  };

  // ============================================
  // 🔧 BARCHA VRACHLARNI BIR TUGMA BILAN YANGILASH
  // ============================================
  const updateAllDoctors = async () => {
    if (!confirm(`Barcha ${doctors.length} ta vrachning districtId larini yangilamoqchimisiz?`)) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      let updatedCount = 0;
      let skippedCount = 0;

      for (const doctor of doctors) {
        const matchedDistrict = districtsData.find(d => 
          normalizeName(d.name) === normalizeName(doctor.district)
        );

        if (matchedDistrict && matchedDistrict.id !== doctor.districtId) {
          await updateDoc(doc(db, 'doctors', doctor.id), {
            districtId: matchedDistrict.id,
            updatedAt: serverTimestamp()
          });
          updatedCount++;
          console.log(`✅ Yangilandi: ${doctor.name} -> districtId: ${matchedDistrict.id}`);
        } else if (!matchedDistrict) {
          skippedCount++;
          console.log(`⚠️ Topilmadi: ${doctor.name} (district: ${doctor.district})`);
        }
      }

      setSuccess(`✅ ${updatedCount} ta vrach yangilandi! ${skippedCount > 0 ? `⚠️ ${skippedCount} ta topilmadi` : ''}`);
      
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Doctor));
      setDoctors(data);

    } catch (error: any) {
      console.error('Xatolik:', error);
      setError('❌ Xatolik: ' + error.message);
    }

    setUpdating(false);
  };

  // ============================================
  // FIREBASE LISTENER
  // ============================================

  useEffect(() => {
    console.log('📡 Districtlarni yuklash...');
    const unsubscribe = onSnapshot(collection(db, 'districts'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DistrictData));
      console.log('✅ Districtlar yuklandi:', data.length, 'ta');
      setDistrictsData(data);
    }, (error) => {
      console.error('❌ Districtlar yuklashda xatolik:', error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(data);
      setLoading(false);
      console.log('✅ Врачлар янгиланди:', data.length, 'та');
    }, (error) => {
      console.error('❌ Listener хатолиги:', error);
      setError('Маълумотларни олишда хатолик: ' + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ============================================
  // VILOYAT VA TUMAN
  // ============================================

  const handleRegionChange = (regionName: string) => {
    setFormData({ ...formData, region: regionName, district: '', districtId: '' });
    const filtered = districtsData
      .filter(d => d.regionName === regionName && d.isActive !== false)
      .map(d => d.name);
    setDistricts(filtered);
    console.log('✅ Viloyat tanlandi:', regionName, 'Tumanlar:', filtered.length, 'ta');
  };

  const handleDistrictChange = (districtName: string) => {
    console.log('🔍 Tanlangan tuman:', districtName);
    const normalizedInput = normalizeName(districtName);
    const foundDistrict = districtsData.find(d => {
      const normalizedDb = normalizeName(d.name);
      return normalizedDb === normalizedInput;
    });
    console.log('✅ Topilgan district:', foundDistrict);
    setFormData({
      ...formData,
      district: districtName,
      districtId: foundDistrict?.id || ''
    });
    console.log('✅ Tuman tanlandi:', districtName, 'ID:', foundDistrict?.id || 'TOPILMADI!');
  };

  // ============================================
  // CRUD
  // ============================================

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let finalDistrictId = formData.districtId;
    if (!finalDistrictId && formData.district) {
      const found = districtsData.find(d => normalizeName(d.name) === normalizeName(formData.district));
      if (found) {
        finalDistrictId = found.id;
        console.log('✅ districtId qayta topildi:', finalDistrictId);
      }
    }

    try {
      const doctorData = {
        name: formData.name,
        phone: formData.phone,
        speciality: formData.speciality || '',
        workplace: formData.workplace || '',
        cardNumber: formData.cardNumber || '',
        cardHolder: formData.cardHolder || '',
        region: formData.region || '',
        regionId: formData.regionId || '',
        district: formData.district || '',
        districtId: finalDistrictId || '',
        mpId: formData.mpId || '',
        projectId: formData.projectId || '',
        telegramId: formData.telegramId || '',
        birthdate: formData.birthdate || '',
        prescriptionCount: 0,
        totalInvestment: 0,
        totalCommission: 0,
        debt: 0,
        debtStatus: 'zero',
        aiScore: 0,
        aiGrade: 'E',
        isActive: true,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp()
      };

      console.log('📝 Saqlanayotgan ma\'lumot:', doctorData);

      await addDoc(collection(db, 'doctors'), doctorData);
      setSuccess('✅ Врач қўшилди!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('❌ Қўшиш хатолиги:', err);
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ушбу врачни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', id));
      setSuccess('✅ Врач ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
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
      regionId: doctor.regionId || '',
      district: doctor.district || '',
      districtId: doctor.districtId || '',
      mpId: doctor.mpId || '',
      projectId: doctor.projectId || '',
      telegramId: doctor.telegramId || '',
      birthdate: doctor.birthdate || ''
    });
    if (doctor.region) {
      const filtered = districtsData
        .filter(d => d.regionName === doctor.region && d.isActive !== false)
        .map(d => d.name);
      setDistricts(filtered);
    }
    setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    let finalDistrictId = formData.districtId;
    if (!finalDistrictId && formData.district) {
      const found = districtsData.find(d => normalizeName(d.name) === normalizeName(formData.district));
      if (found) {
        finalDistrictId = found.id;
      }
    }

    try {
      await updateDoc(doc(db, 'doctors', editingId), {
        name: formData.name,
        phone: formData.phone,
        speciality: formData.speciality || '',
        workplace: formData.workplace || '',
        cardNumber: formData.cardNumber || '',
        cardHolder: formData.cardHolder || '',
        region: formData.region || '',
        regionId: formData.regionId || '',
        district: formData.district || '',
        districtId: finalDistrictId || '',
        mpId: formData.mpId || '',
        projectId: formData.projectId || '',
        telegramId: formData.telegramId || '',
        birthdate: formData.birthdate || '',
        updatedAt: serverTimestamp()
      });
      setSuccess('✅ Врач янгиланди!');
      setEditingId(null);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', speciality: '', workplace: '', cardNumber: '', cardHolder: '', region: '', regionId: '', district: '', districtId: '', mpId: '', projectId: '', telegramId: '', birthdate: '' });
    setDistricts([]);
  };

  // ============================================
  // EKSPORT / IMPORT
  // ============================================

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
      'Қарз (сўм)': doc.debtStatus === 'debt' ? '-' + Math.abs(doc.debt) : doc.debt,
      'Қарз ҳолати': doc.debtStatus === 'debt' ? 'Қарз' : doc.debtStatus === 'profit' ? 'Фойда' : 'Тенг',
      'AI рейтинг': doc.aiGrade || 'E',
      'AI балл': doc.aiScore || 0
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Врачлар');
    XLSX.writeFile(wb, 'врачлар_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        let importedCount = 0;
        for (const row of jsonData) {
          const name = row['Исм'] || row['Name'] || '';
          const phone = String(row['Телефон'] || row['Phone'] || '').replace(/\s/g, '');

          if (name && phone) {
            await addDoc(collection(db, 'doctors'), {
              name: name,
              phone: phone,
              speciality: row['Мутахассислик'] || '',
              workplace: row['Иш жойи'] || '',
              cardNumber: String(row['Карта рақами'] || '').replace(/\s/g, ''),
              cardHolder: row['Карта эгаси'] || '',
              region: row['Вилоят'] || '',
              district: row['Туман'] || '',
              telegramId: row['Telegram ID'] || '',
              birthdate: row['Туғилган куни'] || '',
              prescriptionCount: 0,
              totalInvestment: 0,
              totalCommission: 0,
              debt: 0,
              debtStatus: 'zero',
              aiScore: Number(row['AI балл'] || 0),
              aiGrade: (row['AI рейтинг'] || 'E') as 'A' | 'B' | 'C' | 'D' | 'E',
              isActive: true,
              userId: auth.currentUser?.uid || 'anonymous',
              createdAt: serverTimestamp()
            });
            importedCount++;
          }
        }

        if (importedCount > 0) {
          setSuccess('✅ ' + importedCount + ' та врач импорт қилинди!');
        } else {
          setError('Файлда врачлар топилмади');
        }
      } catch (error) {
        console.error('❌ Импорт хатолиги:', error);
        setError('Файлни ўқишда хатолик юз берди.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ============================================
  // FILTR
  // ============================================

  const getFilteredDoctors = () => {
    let filtered = doctors;

    console.log('🔍 === FILTR ISHGA TUSHDI ===');
    console.log('👤 User role:', user?.role);
    console.log('📍 User districtIds:', user?.districtIds);
    console.log('📍 User districts:', user?.districts);
    console.log('📍 User districtId:', user?.districtId);
    console.log('📋 Barcha vrachlar soni:', doctors.length);

    if (user) {
      const userRole = user.role;
      let targetDistricts: string[] = [];
      
      if (user.districtIds && Array.isArray(user.districtIds) && user.districtIds.length > 0) {
        targetDistricts = user.districtIds;
        console.log('✅ districtIds array dan olindi:', targetDistricts.length, 'ta');
      } else if (user.districts && Array.isArray(user.districts) && user.districts.length > 0) {
        if (typeof user.districts[0] === 'string') {
          targetDistricts = user.districts;
        } else if (typeof user.districts[0] === 'object') {
          targetDistricts = user.districts.map((d: any) => d.id || d).filter(Boolean);
        }
        console.log('✅ districts array dan olindi:', targetDistricts.length, 'ta');
      } else if (user.districtId) {
        targetDistricts = [user.districtId];
        console.log('✅ districtId dan olindi:', targetDistricts);
      }

      console.log('🎯 Target districts:', targetDistricts);

      if (['mp', 'rm', 'ffm'].includes(userRole) && targetDistricts.length > 0) {
        console.log(`✅ ${userRole.toUpperCase()} filtr qo'llanilmoqda`);
        filtered = filtered.filter(doc => {
          const docDistrictId = doc.districtId || doc.district || '';
          const match = targetDistricts.some(td => 
            td === docDistrictId || 
            td === doc.district || 
            td === doc.districtId
          );
          if (!match) {
            console.log(`❌ Filtrdan o'tdi: ${doc.name} (districtId: ${doc.districtId}, district: ${doc.district})`);
          }
          return match;
        });
        console.log(`📊 ${filtered.length} ta vrach qoldi`);
      } else if (['superadmin', 'seo', 'hr', 'pm', 'ofm'].includes(userRole)) {
        console.log('✅ Admin barcha vrachlarni ko\'radi:', filtered.length);
      } else {
        console.log(`ℹ️ ${userRole} uchun filtr qo'llanilmaydi`);
      }
    } else {
      console.log('⚠️ User mavjud emas!');
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name?.toLowerCase().includes(term) ||
        doc.phone?.includes(searchTerm) ||
        doc.speciality?.toLowerCase().includes(term) ||
        (doc.telegramId && doc.telegramId.toLowerCase().includes(term))
      );
    }

    console.log('📊 Yakuniy natija:', filtered.length, 'ta');
    return filtered;
  };

  const filteredDoctors = getFilteredDoctors();

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

  // ============================================
  // RENDER
  // ============================================

  const renderColumn = (key: string, doctor: Doctor, index: number) => {
    switch (key) {
      case 'id': return <td key={key} style={{ padding: '10px 14px' }}>{index + 1}</td>;
      case 'name': return <td key={key} style={{ padding: '10px 14px', fontWeight: 'bold' }}>{doctor.name}</td>;
      case 'speciality': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.speciality || '-'}</td>;
      case 'workplace': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.workplace || '-'}</td>;
      case 'region': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.region || '-'}</td>;
      case 'district': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.district || '-'}</td>;
      case 'phone': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.phone}</td>;
      case 'cardNumber': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.cardNumber || '-'}</td>;
      case 'cardHolder': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.cardHolder || '-'}</td>;
      case 'telegramId': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.telegramId || '-'}</td>;
      case 'birthdate': return <td key={key} style={{ padding: '10px 14px' }}>{doctor.birthdate || '-'}</td>;
      case 'debt': {
        const debtInfo = getDebtDisplay(doctor.debt, doctor.debtStatus);
        return <td key={key} style={{ padding: '10px 14px', color: debtInfo.color, fontWeight: 'bold' }}>{debtInfo.text}</td>;
      }
      case 'ai': {
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
      }
      case 'actions': {
        return (
          <td key={key} style={{ padding: '10px 14px' }}>
            <button onClick={() => handleEdit(doctor)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
            <button onClick={() => handleDelete(doctor.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
          </td>
        );
      }
      default: return null;
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  const regionOptions = Array.from(
    new Set(districtsData.map(d => d.regionName).filter(Boolean))
  );

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>👨‍⚕️ Врачлар ({filteredDoctors.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* ===== 🔧 BARCHA VRACHLARNI YANGILASH TUGMASI ===== */}
          <button
            onClick={updateAllDoctors}
            disabled={updating}
            style={{
              padding: '8px 16px',
              background: updating ? '#ccc' : '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: updating ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {updating ? '⏳ Yangilanmoqda...' : '🔄 District ID ni yangilash'}
          </button>
          
          <input type="text" placeholder="🔍 Қидириш..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '200px' }} />
          <button onClick={() => setShowColumnSettings(!showColumnSettings)} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>⚙️ Устунлар</button>
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} id="importFile" />
          <button onClick={() => document.getElementById('importFile')?.click()} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📥 Импорт</button>
          <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>➕ Врач қўшиш</button>
        </div>
      </div>

      {showColumnSettings && (
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>📋 Устунларни бошқариш</h4>
            <button onClick={() => setShowColumnSettings(false)} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕ Ёпиш</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {columns.map(col => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: col.visible ? '#667eea20' : '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={col.visible} onChange={() => {
                  setColumns(columns.map(c => c.key === col.key ? { ...c, visible: !c.visible } : c));
                }} />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🔴 Қарз</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>{filteredDoctors.filter(d => d.debtStatus === 'debt').length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🟢 Фойда</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2ecc71' }}>{filteredDoctors.filter(d => d.debtStatus === 'profit').length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>🟡 Тенг</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>{filteredDoctors.filter(d => d.debtStatus === 'zero').length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>📊 Жами қарз</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>{filteredDoctors.reduce((sum, d) => sum + d.debt, 0).toLocaleString()} сўм</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                {columns.filter(col => col.visible).map(col => (
                  <th key={col.key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#555' }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr><td colSpan={columns.filter(c => c.visible).length} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>📭 Ҳеч қандай врач топилмади</td></tr>
              ) : (
                filteredDoctors.map((doctor, index) => (
                  <tr key={doctor.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {columns.filter(col => col.visible).map(col => renderColumn(col.key, doctor, index))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div style={{
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
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? '✏️ Врачни таҳрирлаш' : '➕ Янги врач қўшиш'}</h3>
            <form onSubmit={editingId ? handleUpdate : handleAddDoctor}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Исм *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Телефон *</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Telegram ID</label>
                <input type="text" value={formData.telegramId} onChange={(e) => setFormData({...formData, telegramId: e.target.value})} placeholder="@username" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Туғилган куни</label>
                <input type="date" value={formData.birthdate} onChange={(e) => setFormData({...formData, birthdate: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Мутахассислик</label>
                <select value={formData.speciality} onChange={(e) => setFormData({...formData, speciality: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="">Танланг</option>
                  {SPECIALITIES.map((spec) => (<option key={spec} value={spec}>{spec}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Иш жойи</label>
                <input type="text" value={formData.workplace} onChange={(e) => setFormData({...formData, workplace: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Карта рақами</label>
                <input type="text" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Карта эгаси</label>
                <input type="text" value={formData.cardHolder} onChange={(e) => setFormData({...formData, cardHolder: e.target.value})} placeholder="Карта эгасининг FIO" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Вилоят</label>
                <select
                  value={formData.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Танланг</option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Туман</label>
                <select
                  value={formData.district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
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
                <button type="button" onClick={() => { setShowModal(false); resetForm(); setEditingId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;