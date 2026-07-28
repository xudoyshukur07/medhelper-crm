import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  onSnapshot,
  serverTimestamp,
  where,
  orderBy
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// ============ INTERFACES ============

interface Product {
  id: string;
  name: string;
  groupId: string;
  groupName?: string;
  barcode?: string;
  price: number;
  packaging: string;
  dosage?: string;
  composition?: string;
  commissionAmount: number;
  salesCount?: number;
  aiScore?: number;
  usage?: string;
  description?: string;
  isActive: boolean;
}

interface Prescription {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorPhone: string;
  doctorRegion: string;
  doctorDistrict: string;
  doctorSpeciality: string;
  patientName?: string;
  patientPhone?: string;
  patientAge?: string;
  productId: string;
  productName: string;
  productGroupId: string;
  productGroupName: string;
  productBarcode: string;
  productPrice: number;
  productPackaging: string;
  productDosage: string;
  productComposition: string;
  productUsage: string;
  productDescription: string;
  drugName: string;
  drugTarkibi: string;
  drugDoza: string;
  drugMiqdori: string;
  drugQabul: string;
  drugIzoh: string;
  drugQollanishi: string;
  drugBarcode: string;
  receiptNumber: string;
  printedAt: any;
  month: string;
  status: 'active' | 'used' | 'expired';
  isPrinted: boolean;
  printCount: number;
  printStatus: 'pending' | 'success' | 'failed';
  printError?: string;
  printedAt?: any;
  patientId?: string;
  source: string;
  createdAt: any;
}

interface ReceiptTemplate {
  id: string;
  name: string;
  isActive: boolean;
  showHeader: boolean;
  showSubHeader: boolean;
  showQRCode: boolean;
  showTitle: boolean;
  showReceiptNumber: boolean;
  showDate: boolean;
  showPatient: boolean;
  showDoctor: boolean;
  showDoctorPhone: boolean;
  showDoctorRegion: boolean;
  showDrugName: boolean;
  showDrugTarkibi: boolean;
  showDrugDoza: boolean;
  showDrugMiqdori: boolean;
  showDrugQabul: boolean;
  showDrugIzoh: boolean;
  showDrugQollanishi: boolean;
  showProductPrice: boolean;
  showProductPackaging: boolean;
  showProductBarcode: boolean;
  showStatus: boolean;
  showMuddat: boolean;
  showFooter: boolean;
  header: string;
  subHeader: string;
  title: string;
  footer: string;
  fontSize: number;
  fontFamily: string;
  status: string;
  qrCodeText?: string;
  customFields?: { key: string; label: string; value: string }[];
}

interface DoctorStats {
  doctorId: string;
  doctorName: string;
  doctorSpeciality: string;
  doctorRegion: string;
  total: number;
  drugs: { name: string; count: number }[];
  monthly: { month: string; count: number }[];
}

// ============ DEFAULT TEMPLATE ============
const DEFAULT_TEMPLATE: Omit<ReceiptTemplate, 'id'> = {
  name: 'Standart',
  isActive: true,
  showHeader: true,
  showSubHeader: true,
  showQRCode: true,
  showTitle: true,
  showReceiptNumber: true,
  showDate: true,
  showPatient: true,
  showDoctor: true,
  showDoctorPhone: true,
  showDoctorRegion: true,
  showDrugName: true,
  showDrugTarkibi: true,
  showDrugDoza: true,
  showDrugMiqdori: true,
  showDrugQabul: true,
  showDrugIzoh: true,
  showDrugQollanishi: true,
  showProductPrice: true,
  showProductPackaging: true,
  showProductBarcode: true,
  showStatus: true,
  showMuddat: true,
  showFooter: true,
  header: '🏥 MedHelper',
  subHeader: 'Электрон рецепт тизими',
  title: 'Оддий Электрон Рецепт',
  footer: '* Бу рецепт фақат БАД учун *\nMedHelper электрон тизими',
  fontSize: 14,
  fontFamily: 'Courier New',
  status: 'active',
  qrCodeText: '',
  customFields: []
};

// ============ PRESCRIPTIONS COMPONENT ============
const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'template'>('stats');
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [newCustomField, setNewCustomField] = useState({ key: '', label: '', value: '' });
  const [previewReceipt, setPreviewReceipt] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    doctorPhone: '',
    doctorRegion: '',
    doctorDistrict: '',
    doctorSpeciality: '',
    patientName: '',
    patientPhone: '',
    patientAge: '',
    productId: '',
    productName: '',
    productGroupId: '',
    productGroupName: '',
    productBarcode: '',
    productPrice: 0,
    productPackaging: '',
    productDosage: '',
    productComposition: '',
    productUsage: '',
    productDescription: '',
    drugName: '',
    drugTarkibi: '',
    drugDoza: '',
    drugMiqdori: '',
    drugQabul: '',
    drugIzoh: '',
    drugQollanishi: '',
    drugBarcode: '',
    status: 'active' as 'active' | 'used' | 'expired'
  });

  const canManage = user?.role === 'superadmin' || user?.role === 'admin';

  // ============ LOAD DATA ============
  useEffect(() => {
    const q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Prescription));
      setPrescriptions(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(data);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'receiptTemplates'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReceiptTemplate));
      
      if (data.length > 0) {
        setReceiptTemplate(data[0]);
        setEditingTemplate(data[0]);
      } else {
        createDefaultTemplate();
      }
    });
    return unsubscribe;
  }, []);

  const createDefaultTemplate = async () => {
    try {
      const docRef = await addDoc(collection(db, 'receiptTemplates'), DEFAULT_TEMPLATE);
      console.log('✅ Default template yaratildi:', docRef.id);
    } catch (error) {
      console.error('❌ Template yaratishda xatolik:', error);
    }
  };

  // ============ PRODUCT SELECT HANDLER ============
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        productId: product.id,
        productName: product.name,
        productGroupId: product.groupId || '',
        productGroupName: product.groupName || '',
        productBarcode: product.barcode || '',
        productPrice: product.price || 0,
        productPackaging: product.packaging || '',
        productDosage: product.dosage || '',
        productComposition: product.composition || '',
        productUsage: product.usage || '',
        productDescription: product.description || '',
        drugName: product.name,
        drugTarkibi: product.composition || '',
        drugDoza: product.dosage || '',
        drugMiqdori: product.packaging || '',
        drugQabul: product.usage || '',
        drugIzoh: product.description || '',
        drugQollanishi: '',
        drugBarcode: product.barcode || ''
      });
    }
  };

  // ============ CRUD ============
  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.productId) {
      alert('Vrach va preparat majburiy!');
      return;
    }

    const now = new Date();
    const receiptNumber = 'RX' + now.getFullYear() + 
      String(now.getMonth()+1).padStart(2,'0') + 
      String(now.getDate()).padStart(2,'0') + 
      String(now.getHours()).padStart(2,'0') + 
      String(now.getMinutes()).padStart(2,'0') + 
      String(now.getSeconds()).padStart(2,'0');

    try {
      if (editingPrescriptionId) {
        await updateDoc(doc(db, 'prescriptions', editingPrescriptionId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        alert('✅ Retsept yangilandi!');
      } else {
        await addDoc(collection(db, 'prescriptions'), {
          ...formData,
          receiptNumber,
          month: new Date().toISOString().slice(0, 7),
          printedAt: new Date(),
          status: 'active',
          isPrinted: false,
          printCount: 0,
          printStatus: 'pending',
          source: 'crm',
          createdBy: user?.id || '',
          createdAt: serverTimestamp()
        });
        alert('✅ Retsept yaratildi!');
      }
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      doctorId: '',
      doctorName: '',
      doctorPhone: '',
      doctorRegion: '',
      doctorDistrict: '',
      doctorSpeciality: '',
      patientName: '',
      patientPhone: '',
      patientAge: '',
      productId: '',
      productName: '',
      productGroupId: '',
      productGroupName: '',
      productBarcode: '',
      productPrice: 0,
      productPackaging: '',
      productDosage: '',
      productComposition: '',
      productUsage: '',
      productDescription: '',
      drugName: '',
      drugTarkibi: '',
      drugDoza: '',
      drugMiqdori: '',
      drugQabul: '',
      drugIzoh: '',
      drugQollanishi: '',
      drugBarcode: '',
      status: 'active'
    });
    setEditingPrescriptionId(null);
  };

  // ============ STATISTICS ============
  const getDoctorStats = (): DoctorStats[] => {
    const stats: Record<string, DoctorStats> = {};
    
    prescriptions.forEach(p => {
      if (!stats[p.doctorId]) {
        stats[p.doctorId] = {
          doctorId: p.doctorId,
          doctorName: p.doctorName,
          doctorSpeciality: p.doctorSpeciality || '',
          doctorRegion: p.doctorRegion || '',
          total: 0,
          drugs: [],
          monthly: []
        };
      }
      stats[p.doctorId].total++;
    });

    Object.keys(stats).forEach(doctorId => {
      const doctorPrescriptions = prescriptions.filter(p => p.doctorId === doctorId);
      
      const drugCount: Record<string, number> = {};
      doctorPrescriptions.forEach(p => {
        drugCount[p.drugName] = (drugCount[p.drugName] || 0) + 1;
      });
      stats[doctorId].drugs = Object.entries(drugCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      const monthCount: Record<string, number> = {};
      doctorPrescriptions.forEach(p => {
        const month = p.month || new Date(p.printedAt?.toDate?.() || p.printedAt).toISOString().slice(0, 7);
        monthCount[month] = (monthCount[month] || 0) + 1;
      });
      stats[doctorId].monthly = Object.entries(monthCount)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count }));
    });

    return Object.values(stats);
  };

  const doctorStats = getDoctorStats();

  // ============ FILTERED PRESCRIPTIONS ============
  const getFilteredPrescriptions = () => {
    let filtered = prescriptions;
    
    if (selectedMonth) {
      filtered = filtered.filter(p => {
        const month = p.month || new Date(p.printedAt?.toDate?.() || p.printedAt).toISOString().slice(0, 7);
        return month === selectedMonth;
      });
    }
    
    if (selectedDoctor !== 'all') {
      filtered = filtered.filter(p => p.doctorId === selectedDoctor);
    }
    
    if (selectedSpeciality !== 'all') {
      filtered = filtered.filter(p => p.doctorSpeciality === selectedSpeciality);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredPrescriptions = getFilteredPrescriptions();

  // ============ TEMPLATE FUNCTIONS ============
  const updateTemplate = async (data: Partial<ReceiptTemplate>) => {
    if (!editingTemplate) return;
    try {
      await updateDoc(doc(db, 'receiptTemplates', editingTemplate.id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      alert('✅ Shablon yangilandi!');
      // Reload template
      const q = query(collection(db, 'receiptTemplates'), where('isActive', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ReceiptTemplate));
        if (data.length > 0) {
          setReceiptTemplate(data[0]);
          setEditingTemplate(data[0]);
        }
      });
      setTimeout(() => unsubscribe(), 500);
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const addCustomField = () => {
    if (!newCustomField.key || !newCustomField.label) {
      alert('Kalit va label majburiy!');
      return;
    }
    const fields = editingTemplate?.customFields || [];
    fields.push({ 
      key: newCustomField.key, 
      label: newCustomField.label, 
      value: newCustomField.value || '' 
    });
    setEditingTemplate({ ...editingTemplate!, customFields: fields });
    setNewCustomField({ key: '', label: '', value: '' });
    setShowCustomFieldModal(false);
  };

  const removeCustomField = (index: number) => {
    const fields = editingTemplate?.customFields || [];
    fields.splice(index, 1);
    setEditingTemplate({ ...editingTemplate!, customFields: fields });
  };

  // ============ GENERATE PREVIEW ============
  const generatePreview = () => {
    if (!editingTemplate) return;
    const t = editingTemplate;
    const sampleProduct = {
      name: 'Амарецинк 30 мл',
      composition: 'Рух Бисглицинат',
      dosage: '1 мл да 62,5 мг',
      packaging: '30 мл',
      usage: 'кунига 1-2 махал',
      description: 'микро элемент',
      barcode: '8018799000646',
      price: 150000
    };

    let preview = '';
    
    if (t.showHeader !== false) {
      preview += '🏥 ' + (t.header || 'MedHelper') + '\n';
    }
    if (t.showSubHeader !== false) {
      preview += (t.subHeader || 'Электрон рецепт тизими') + '\n\n';
    }
    if (t.showTitle !== false) {
      preview += (t.title || 'Оддий Электрон Рецепт') + '\n';
    }
    if (t.showReceiptNumber !== false) {
      preview += 'Рецепт №: RX20260708105841\n';
    }
    if (t.showDate !== false) {
      preview += 'Сана: ' + new Date().toLocaleString('uz-UZ') + '\n';
    }
    if (t.showPatient !== false) {
      preview += '👤 Бемор: Алимов Али\n';
    }
    preview += '─────────────────────\n';
    if (t.showDrugName !== false) {
      preview += '💊 Препарат: ' + sampleProduct.name + '\n';
    }
    if (t.showDrugTarkibi !== false) {
      preview += '   таркиби: ' + sampleProduct.composition + '\n';
    }
    if (t.showDrugDoza !== false) {
      preview += '   ⚡ Дозаси: ' + sampleProduct.dosage + '\n';
    }
    if (t.showDrugMiqdori !== false) {
      preview += '   📦 Миқдори: ' + sampleProduct.packaging + '\n';
    }
    if (t.showDrugQabul !== false) {
      preview += '   🕐 Қабул: ' + sampleProduct.usage + '\n';
    }
    if (t.showDrugIzoh !== false) {
      preview += '   📝 Изоҳ: ' + sampleProduct.description + '\n';
    }
    if (t.showProductPrice !== false) {
      preview += '   💰 Нархи: ' + sampleProduct.price.toLocaleString() + ' сўм\n';
    }
    if (t.showProductPackaging !== false) {
      preview += '   📦 Қадоқ: ' + sampleProduct.packaging + '\n';
    }
    if (t.showProductBarcode !== false) {
      preview += '   🔢 Штрих код: ' + sampleProduct.barcode + '\n';
    }
    preview += '─────────────────────\n';
    if (t.showStatus !== false) {
      preview += '✅ Ҳолат: Фаол\n';
    }
    if (t.showMuddat !== false) {
      preview += 'Муддат: 30 кун\n';
    }
    if (t.showDoctor !== false) {
      preview += '👨‍⚕️ Шифокор: Доктор Тестов\n';
    }
    if (t.showDoctorPhone !== false) {
      preview += '📞 Телефон: +998 90 123 45 67\n';
    }
    if (t.showDoctorRegion !== false) {
      preview += '📍 Манзил: Тошкент, Чилонзор\n';
    }
    (t.customFields || []).forEach(function(field) {
      preview += field.label + ': ' + field.value + '\n';
    });
    if (t.showFooter !== false) {
      preview += '\n' + (t.footer || '* Бу рецепт фақат БАД учун *');
    }
    
    setPreviewReceipt(preview);
  };

  // ============ EXPORT ============
  const handleExportStats = () => {
    const data = doctorStats.map((s, i) => ({
      '№': i + 1,
      'Vrach': s.doctorName,
      'Mutaxassislik': s.doctorSpeciality,
      'Region': s.doctorRegion,
      'Jami': s.total,
      'Preparatlar': s.drugs.map(function(d) { return d.name + '(' + d.count + ')'; }).join('; '),
      'Oylik': s.monthly.map(function(m) { return m.month + ': ' + m.count; }).join('; ')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Statistika');
    XLSX.writeFile(wb, 'vrach_statistika_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  const handleExportList = () => {
    const data = filteredPrescriptions.map((p, i) => ({
      '№': i + 1,
      'Vrach': p.doctorName,
      'Telefon': p.doctorPhone,
      'Preparat': p.drugName,
      'Guruh': p.productGroupName || '-',
      'Viloyat': p.doctorRegion || '-',
      'Tuman': p.doctorDistrict || '-',
      'Retsept №': p.receiptNumber,
      'Sana': new Date(p.printedAt?.toDate?.() || p.printedAt).toLocaleString('uz-UZ'),
      'Holat': p.status,
      'Chop holati': p.printStatus || 'pending'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Retseptlar');
    XLSX.writeFile(wb, 'retseptlar_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // ============ RENDER ============
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>📋 Retseptlar</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '20px', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'stats' ? '#667eea' : 'white',
            color: activeTab === 'stats' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'stats' ? 'bold' : 'normal',
            borderBottom: activeTab === 'stats' ? 'none' : '1px solid #ddd'
          }}
        >
          📊 Vrachlar statistikasi
        </button>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'list' ? '#667eea' : 'white',
            color: activeTab === 'list' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'list' ? 'bold' : 'normal',
            borderBottom: activeTab === 'list' ? 'none' : '1px solid #ddd'
          }}
        >
          📋 Retseptlar ro'yxati
        </button>
        <button
          onClick={() => setActiveTab('template')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'template' ? '#667eea' : 'white',
            color: activeTab === 'template' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'template' ? 'bold' : 'normal',
            borderBottom: activeTab === 'template' ? 'none' : '1px solid #ddd'
          }}
        >
          🎨 Retsept shabloni
        </button>
      </div>

      {/* 1-BO'LIM: STATISTIKA */}
      {activeTab === 'stats' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
              <select
                value={selectedSpeciality}
                onChange={(e) => setSelectedSpeciality(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="all">📋 Barcha mutaxassisliklar</option>
                {[...new Set(prescriptions.map(p => p.doctorSpeciality).filter(Boolean))].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button onClick={handleExportStats} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              📤 Eksport
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
            {doctorStats.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>
                📭 Hech qanday statistika mavjud emas
              </div>
            ) : (
              doctorStats
                .filter(s => selectedSpeciality === 'all' || s.doctorSpeciality === selectedSpeciality)
                .map((stat) => (
                  <div key={stat.doctorId} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #667eea' }}>
                    <h4 style={{ margin: '0 0 4px' }}>👨‍⚕️ {stat.doctorName}</h4>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {stat.doctorSpeciality} | 📍 {stat.doctorRegion}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '8px' }}>
                      📋 <strong>{stat.total}</strong> ta retsept
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px' }}>
                      <strong>💊 Preparatlar:</strong>
                      {stat.drugs.map(function(d) { return d.name + ' (' + d.count + ')'; }).join(', ')}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                      <strong>📅 Oylik:</strong>
                      {stat.monthly.map(function(m) { return m.month + ': ' + m.count; }).join(' | ')}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 2-BO'LIM: RETSEPTLAR RO'YXATI */}
      {activeTab === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
              />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <option value="all">👨‍⚕️ Barcha vrachlar</option>
                {[...new Set(prescriptions.map(p => p.doctorId))].map(function(id) {
                  var p = prescriptions.find(function(pr) { return pr.doctorId === id; });
                  return <option key={id} value={id}>{p?.doctorName || id}</option>;
                })}
              </select>
            </div>
            <button onClick={handleExportList} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              📤 Eksport
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>№</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Vrach</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Preparat</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Viloyat</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tuman</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Retsept №</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Sana</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Chop holati</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>📭 Hech qanday retsept topilmadi</td></tr>
                  ) : (
                    filteredPrescriptions.map(function(p, index) {
                      var printStatus = p.printStatus || 'pending';
                      var statusLabels = {
                        pending: { label: '⏳ Kutilmoqda', color: '#f39c12', bg: '#fff3cd' },
                        success: { label: '✅ Chop etilgan', color: '#28a745', bg: '#d4edda' },
                        failed: { label: '❌ Xatolik', color: '#dc3545', bg: '#f8d7da' }
                      };
                      var statusInfo = statusLabels[printStatus] || statusLabels.pending;
                      
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{p.doctorName}</td>
                          <td style={{ padding: '10px 14px' }}>{p.drugName}</td>
                          <td style={{ padding: '10px 14px' }}>{p.doctorRegion || '-'}</td>
                          <td style={{ padding: '10px 14px' }}>{p.doctorDistrict || '-'}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{p.receiptNumber}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {new Date(p.printedAt?.toDate?.() || p.printedAt).toLocaleDateString('uz-UZ')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: statusInfo.bg,
                              color: statusInfo.color,
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {statusInfo.label}
                            </span>
                            {p.printError && (
                              <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>{p.printError}</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: p.status === 'active' ? '#d4edda' : p.status === 'used' ? '#cce5ff' : '#f8d7da',
                              color: p.status === 'active' ? '#155724' : p.status === 'used' ? '#004085' : '#721c24',
                              fontSize: '12px'
                            }}>
                              {p.status === 'active' ? 'Faol' : p.status === 'used' ? 'Ishlatilgan' : 'Muddati otgan'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3-BO'LIM: RETSEPT SHAKLONI */}
      {activeTab === 'template' && editingTemplate && (
        <div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#764ba2' }}>🎨 Retsept shabloni</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={generatePreview}
                  style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  👁️ Preview
                </button>
                <button
                  onClick={() => updateTemplate(editingTemplate)}
                  style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  💾 Saqlash
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📝 Shablon nomi</label>
                  <input
                    type="text"
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>🔤 Shrift o'lchami</label>
                  <input
                    type="number"
                    value={editingTemplate.fontSize || 14}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, fontSize: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📋 Ko'rinadigan ma'lumotlar</label>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>
                    {[
                      { key: 'showHeader', label: '🏥 Header (MedHelper)' },
                      { key: 'showSubHeader', label: '📝 Sub-header' },
                      { key: 'showQRCode', label: '📱 QR kod' },
                      { key: 'showTitle', label: '📋 Sarlavha' },
                      { key: 'showReceiptNumber', label: '🔢 Retsept raqami' },
                      { key: 'showDate', label: '📅 Sana' },
                      { key: 'showPatient', label: '👤 Bemor ma\'lumotlari' },
                      { key: 'showDoctor', label: '👨‍⚕️ Vrach ismi' },
                      { key: 'showDoctorPhone', label: '📞 Vrach telefoni' },
                      { key: 'showDoctorRegion', label: '📍 Vrach manzili' },
                      { key: 'showDrugName', label: '💊 Preparat nomi' },
                      { key: 'showDrugTarkibi', label: '📝 Tarkibi' },
                      { key: 'showDrugDoza', label: '⚡ Doza' },
                      { key: 'showDrugMiqdori', label: '📦 Miqdori' },
                      { key: 'showDrugQabul', label: '🕐 Qabul' },
                      { key: 'showDrugIzoh', label: '📝 Izoh' },
                      { key: 'showDrugQollanishi', label: '📋 Qo\'llanishi' },
                      { key: 'showProductPrice', label: '💰 Narxi' },
                      { key: 'showProductPackaging', label: '📦 Қадоқ' },
                      { key: 'showProductBarcode', label: '🔢 Штрих код' },
                      { key: 'showStatus', label: '✅ Holat' },
                      { key: 'showMuddat', label: '⏳ Muddat' },
                      { key: 'showFooter', label: '📄 Footer' }
                    ].map(function(item) {
                      return (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(editingTemplate as any)[item.key] !== false}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, [item.key]: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px' }}>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📝 Matnlar</label>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>Header</label>
                      <input
                        type="text"
                        value={editingTemplate.header || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, header: e.target.value })}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>Sub-header</label>
                      <input
                        type="text"
                        value={editingTemplate.subHeader || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subHeader: e.target.value })}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>Title</label>
                      <input
                        type="text"
                        value={editingTemplate.title || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>Footer</label>
                      <textarea
                        value={editingTemplate.footer || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, footer: e.target.value })}
                        rows={2}
                        style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px' }}>📋 Custom maydonlar</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>
                    {(editingTemplate.customFields || []).map(function(field, index) {
                      return (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              var fields = editingTemplate.customFields || [];
                              fields[index].label = e.target.value;
                              setEditingTemplate({ ...editingTemplate, customFields: fields });
                            }}
                            placeholder="Label"
                            style={{ flex: 1, padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                          />
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              var fields = editingTemplate.customFields || [];
                              fields[index].value = e.target.value;
                              setEditingTemplate({ ...editingTemplate, customFields: fields });
                            }}
                            placeholder="Qiymat"
                            style={{ flex: 1, padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                          />
                          <button
                            onClick={() => removeCustomField(index)}
                            style={{ padding: '2px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✖
                          </button>
                        </div>
                      );
                    })}
                    {(!editingTemplate.customFields || editingTemplate.customFields.length === 0) && (
                      <div style={{ color: '#999', textAlign: 'center', padding: '10px', fontSize: '12px' }}>
                        Hali custom maydonlar yo'q
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCustomFieldModal(true)}
                    style={{ marginTop: '8px', padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ➕ Custom maydon qo'shish
                  </button>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      if (confirm('Shablonni default holatga qaytarmoqchimisiz?')) {
                        var defaultTemplate = {
                          ...DEFAULT_TEMPLATE,
                          id: editingTemplate.id
                        };
                        setEditingTemplate(defaultTemplate);
                        updateTemplate(defaultTemplate);
                      }
                    }}
                    style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    🔄 Default
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>👁️ Preview</h4>
                <div style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  minHeight: '400px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  fontSize: (editingTemplate.fontSize || 14) + 'px',
                  fontFamily: editingTemplate.fontFamily || 'Courier New',
                  whiteSpace: 'pre-line'
                }}>
                  {previewReceipt || '👁️ "Preview" tugmasini bosing'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Field Modal */}
      {showCustomFieldModal && (
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
        }} onClick={() => setShowCustomFieldModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#764ba2' }}>📋 Custom maydon qo'shish</h3>
              <button
                onClick={() => setShowCustomFieldModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', fontSize: '13px' }}>🏷️ Label *</label>
              <input
                type="text"
                value={newCustomField.label}
                onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                placeholder="Masalan: Bemor manzili"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', fontSize: '13px' }}>🔑 Kalit *</label>
              <input
                type="text"
                value={newCustomField.key}
                onChange={(e) => setNewCustomField({ ...newCustomField, key: e.target.value })}
                placeholder="Masalan: patient_address"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '5px', fontSize: '13px' }}>📝 Qiymat (ixtiyoriy)</label>
              <input
                type="text"
                value={newCustomField.value}
                onChange={(e) => setNewCustomField({ ...newCustomField, value: e.target.value })}
                placeholder="Default qiymat"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setShowCustomFieldModal(false)}
                style={{ padding: '8px 16px', flex: 1, background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Bekor
              </button>
              <button
                onClick={addCustomField}
                style={{ padding: '8px 16px', flex: 2, background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                ➕ Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
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
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#764ba2' }}>
              {editingPrescriptionId ? '✏️ Retseptni tahrirlash' : '➕ Yangi retsept'}
            </h3>
            
            <form onSubmit={handleSavePrescription}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>👨‍⚕️ Vrach *</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => {
                    const doctor = { id: e.target.value, name: 'Doctor', phone: '', region: '', district: '', speciality: '' };
                    setFormData({
                      ...formData,
                      doctorId: e.target.value,
                      doctorName: doctor.name,
                      doctorPhone: doctor.phone || '',
                      doctorRegion: doctor.region || '',
                      doctorDistrict: doctor.district || '',
                      doctorSpeciality: doctor.speciality || ''
                    });
                  }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Vrach tanlang</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>💊 Preparat *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Preparat tanlang</option>
                  {products.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {formData.productId && (
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    <div>📝 Tarkibi: {formData.productComposition || '-'}</div>
                    <div>⚡ Doza: {formData.productDosage || '-'}</div>
                    <div>📦 Miqdori: {formData.productPackaging || '-'}</div>
                    <div>🕐 Qabul: {formData.productUsage || '-'}</div>
                    <div>💰 Narxi: {formData.productPrice ? formData.productPrice.toLocaleString() + ' сўм' : '-'}</div>
                    <div>🔢 Barcode: {formData.productBarcode || '-'}</div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>👤 Bemor ismi</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📞 Bemor telefon</label>
                <input
                  type="text"
                  value={formData.patientPhone}
                  onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>🎂 Bemor yoshi</label>
                <input
                  type="text"
                  value={formData.patientAge}
                  onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  style={{ padding: '8px 16px', flex: 1, background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', flex: 2, background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {editingPrescriptionId ? '✏️ Yangilash' : '➕ Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;