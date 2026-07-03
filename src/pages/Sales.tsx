import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase/config';
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

// ============ INTERFACES ============

interface ZoneSales {
  id: string;
  regionId: string;
  regionName: string;
  zoneId: string;
  zoneName: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface DoctorSales {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorRegion: string;
  doctorZone: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  totalCommission: number;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface PharmacySales {
  id: string;
  pharmacyName: string;
  pharmacyAddress: string;
  inn: string;
  regionId: string;
  regionName: string;
  zoneId: string;
  zoneName: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  invoiceNumber?: string;
  notes?: string;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface Product {
  id: string;
  name: string;
  groupId: string;
  groupName?: string;
  price: number;
  commissionAmount: number;
}

interface Doctor {
  id: string;
  name: string;
  region: string;
  zone: string;
}

// ============ REGIONS MODULIDAN KELADIGAN MA'LUMOTLAR ============

interface Region {
  id: string;
  name: string;
  code: string;
  description: string;
  groupId: string;
  groupName: string;
  zoneIds: string[];
  zoneNames: string[];
  isActive: boolean;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  description: string;
  groupId: string;
  groupName: string;
  viloyatlar: string[];
  tumanlar: string[];
  isActive: boolean;
}

// ============ INN MA'LUMOTLARI ============

const PHARMACY_INN_DB: { [key: string]: { region: string; zone: string } } = {
  '123456789': { region: 'Тошкент', zone: 'Чилонзор' },
  '987654321': { region: 'Тошкент', zone: 'Яккасарой' },
  '456789123': { region: 'Самарқанд', zone: 'Самарқанд ш.' },
  '789123456': { region: 'Самарқанд', zone: 'Булунғур' },
  '321654987': { region: 'Тошкент', zone: 'Миробод' },
};

// ============ ASOSIY KOMPONENT ============

const Sales: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'zone' | 'doctor' | 'pharmacy'>('zone');

  // ===== REGIONS MODULIDAN KELGAN MA'LUMOTLAR =====
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  // Zone Sales
  const [zoneSales, setZoneSales] = useState<ZoneSales[]>([]);
  const [zoneProducts, setZoneProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [zoneMonth, setZoneMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);

  // Doctor Sales
  const [doctorSales, setDoctorSales] = useState<DoctorSales[]>([]);
  const [doctorProducts, setDoctorProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [doctorMonth, setDoctorMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bulkProducts, setBulkProducts] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 }
  ]);

  // Pharmacy Sales
  const [pharmacySales, setPharmacySales] = useState<PharmacySales[]>([]);
  const [pharmacyProducts, setPharmacyProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [pharmacyMonth, setPharmacyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyInn, setPharmacyInn] = useState('');
  const [pharmacyRegionId, setPharmacyRegionId] = useState('');
  const [pharmacyZoneId, setPharmacyZoneId] = useState('');
  const [pharmacyAvailableZones, setPharmacyAvailableZones] = useState<Zone[]>([]);
  const [pharmacyInvoice, setPharmacyInvoice] = useState('');
  const [pharmacyNotes, setPharmacyNotes] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ============ LOAD REGIONS FROM FIREBASE ============

  // Regions modulidan regionlarni yuklash
  useEffect(() => {
    const q = query(collection(db, 'regions'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Region));
      setRegions(data);
    });
    return unsubscribe;
  }, []);

  // Regions modulidan zonalarni yuklash
  useEffect(() => {
    const q = query(collection(db, 'zones'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Zone));
      setZones(data);
    });
    return unsubscribe;
  }, []);

  // Region tanlanganda unga tegishli zonalarni filtrlash
  useEffect(() => {
    if (selectedRegionId) {
      const region = regions.find(r => r.id === selectedRegionId);
      if (region) {
        const filteredZones = zones.filter(z => region.zoneIds.includes(z.id));
        setAvailableZones(filteredZones);
      } else {
        setAvailableZones([]);
      }
    } else {
      setAvailableZones([]);
    }
  }, [selectedRegionId, regions, zones]);

  // Pharmacy uchun Region tanlanganda zonalarni filtrlash
  useEffect(() => {
    if (pharmacyRegionId) {
      const region = regions.find(r => r.id === pharmacyRegionId);
      if (region) {
        const filteredZones = zones.filter(z => region.zoneIds.includes(z.id));
        setPharmacyAvailableZones(filteredZones);
      } else {
        setPharmacyAvailableZones([]);
      }
    } else {
      setPharmacyAvailableZones([]);
    }
  }, [pharmacyRegionId, regions, zones]);

  // ============ LOAD OTHER DATA ============

  // Load products
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

  // Load doctors
  useEffect(() => {
    const q = query(collection(db, 'doctors'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Doctor));
      setDoctors(data);
    });
    return unsubscribe;
  }, []);

  // Load zone sales
  useEffect(() => {
    const q = query(collection(db, 'zoneSales'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ZoneSales));
      setZoneSales(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load doctor sales
  useEffect(() => {
    const q = query(collection(db, 'doctorSales'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DoctorSales));
      setDoctorSales(data);
    });
    return unsubscribe;
  }, []);

  // Load pharmacy sales
  useEffect(() => {
    const q = query(collection(db, 'pharmacySales'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PharmacySales));
      setPharmacySales(data);
    });
    return unsubscribe;
  }, []);

  // ============ ZONE SALES CRUD ============

  const handleAddZoneSale = async () => {
    setError('');
    setSuccess('');

    if (!selectedRegionId || zoneProducts.length === 0) {
      setError('Регион ва камида 1 та препарат киритинг!');
      return;
    }

    const region = regions.find(r => r.id === selectedRegionId);
    const zone = zones.find(z => z.id === selectedZoneId);

    const totalAmount = zoneProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.price || 0) * p.quantity;
    }, 0);

    try {
      await addDoc(collection(db, 'zoneSales'), {
        regionId: selectedRegionId,
        regionName: region?.name || '',
        zoneId: selectedZoneId || '',
        zoneName: zone?.name || 'Барча зоналар',
        month: zoneMonth,
        products: zoneProducts,
        totalAmount,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp()
      });
      setSuccess('Зона сотуви сақланди!');
      setZoneProducts([]);
      setSelectedRegionId('');
      setSelectedZoneId('');
      setAvailableZones([]);
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteZoneSale = async (id: string) => {
    if (!confirm('Ушбу сотувни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'zoneSales', id));
      setSuccess('Сотув ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ DOCTOR SALES CRUD ============

  const handleAddDoctorSale = async () => {
    setError('');
    setSuccess('');

    if (!selectedDoctor || doctorProducts.length === 0) {
      setError('Врач ва камида 1 та препарат киритинг!');
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctor);
    const totalAmount = doctorProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.price || 0) * p.quantity;
    }, 0);
    const totalCommission = doctorProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.commissionAmount || 0) * p.quantity;
    }, 0);

    try {
      await addDoc(collection(db, 'doctorSales'), {
        doctorId: selectedDoctor,
        doctorName: doctor?.name || '',
        doctorRegion: doctor?.region || '',
        doctorZone: doctor?.zone || '',
        month: doctorMonth,
        products: doctorProducts,
        totalAmount,
        totalCommission,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp()
      });
      setSuccess('Врач сотуви сақланди!');
      setDoctorProducts([]);
      setSelectedDoctor('');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteDoctorSale = async (id: string) => {
    if (!confirm('Ушбу сотувни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'doctorSales', id));
      setSuccess('Сотув ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ PHARMACY SALES CRUD ============

  const handleAddPharmacySale = async () => {
    setError('');
    setSuccess('');

    if (!pharmacyName || pharmacyProducts.length === 0) {
      setError('Аптека номи ва камида 1 та препарат киритинг!');
      return;
    }

    const region = regions.find(r => r.id === pharmacyRegionId);
    const zone = zones.find(z => z.id === pharmacyZoneId);

    const totalAmount = pharmacyProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.price || 0) * p.quantity;
    }, 0);

    try {
      await addDoc(collection(db, 'pharmacySales'), {
        pharmacyName,
        pharmacyAddress: pharmacyAddress || '-',
        inn: pharmacyInn || '',
        regionId: pharmacyRegionId || '',
        regionName: region?.name || '',
        zoneId: pharmacyZoneId || '',
        zoneName: zone?.name || '',
        month: pharmacyMonth,
        products: pharmacyProducts,
        totalAmount,
        invoiceNumber: pharmacyInvoice || '',
        notes: pharmacyNotes || '',
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp()
      });
      setSuccess('Аптека сотуви сақланди!');
      setPharmacyProducts([]);
      setPharmacyName('');
      setPharmacyAddress('');
      setPharmacyInn('');
      setPharmacyRegionId('');
      setPharmacyZoneId('');
      setPharmacyAvailableZones([]);
      setPharmacyInvoice('');
      setPharmacyNotes('');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeletePharmacySale = async (id: string) => {
    if (!confirm('Ушбу сотувни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'pharmacySales', id));
      setSuccess('Сотув ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ PRODUCT HANDLERS ============

  const handleRemoveZoneProduct = (index: number) => {
    setZoneProducts(zoneProducts.filter((_, i) => i !== index));
  };

  const handleRemoveDoctorProduct = (index: number) => {
    setDoctorProducts(doctorProducts.filter((_, i) => i !== index));
  };

  const handleRemovePharmacyProduct = (index: number) => {
    setPharmacyProducts(pharmacyProducts.filter((_, i) => i !== index));
  };

  // ============ BULK PRODUCT HANDLERS ============

  const handleBulkProductChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const newBulk = [...bulkProducts];
    newBulk[index] = { ...newBulk[index], [field]: value };
    setBulkProducts(newBulk);
  };

  const addBulkProductRow = () => {
    setBulkProducts([...bulkProducts, { productId: '', quantity: 1 }]);
  };

  const removeBulkProductRow = (index: number) => {
    if (bulkProducts.length > 1) {
      setBulkProducts(bulkProducts.filter((_, i) => i !== index));
    }
  };

  const handleAddBulkProducts = () => {
    const validProducts = bulkProducts.filter(p => p.productId && p.quantity > 0);
    if (validProducts.length === 0) {
      alert('Камида 1 та препарат танланг!');
      return;
    }

    const newProducts = validProducts.map(p => ({
      productId: p.productId,
      quantity: Number(p.quantity)
    }));

    const existingIds = doctorProducts.map(p => p.productId);
    const duplicates = newProducts.filter(p => existingIds.includes(p.productId));
    if (duplicates.length > 0) {
      const names = duplicates.map(p => {
        const product = products.find(pr => pr.id === p.productId);
        return product?.name || '';
      }).join(', ');
      alert('Бу препаратлар аллақачон қўшилган: ' + names);
      return;
    }

    setDoctorProducts([...doctorProducts, ...newProducts]);
    setBulkProducts([{ productId: '', quantity: 1 }]);
    alert(validProducts.length + ' та препарат қўшилди!');
  };

  // ============ PHARMACY IMPORT ============

  const handlePharmacyImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const importedProducts: { productId: string; quantity: number }[] = [];
        let totalAmount = 0;
        let pharmacyName = '';
        let pharmacyInn = '';
        let pharmacyAddress = '';
        let pharmacyRegionId = '';
        let pharmacyZoneId = '';

        jsonData.forEach((row: any) => {
          const productName = row['Препарат'] || row['Drug'] || '';
          const quantity = Number(row['Миқдор'] || row['Quantity'] || 0);
          const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());

          if (!pharmacyName && row['Аптека']) pharmacyName = row['Аптека'];
          if (!pharmacyInn && row['ИНН']) pharmacyInn = String(row['ИНН']);
          if (!pharmacyAddress && row['Манзил']) pharmacyAddress = row['Манзил'];

          if (product && quantity > 0) {
            importedProducts.push({ productId: product.id, quantity });
            totalAmount += product.price * quantity;
          }
        });

        // INN bo'yicha region va zone aniqlash
        if (pharmacyInn && PHARMACY_INN_DB[pharmacyInn]) {
          const loc = PHARMACY_INN_DB[pharmacyInn];
          const region = regions.find(r => r.name === loc.region);
          if (region) {
            pharmacyRegionId = region.id;
            const zone = zones.find(z => z.name === loc.zone && region.zoneIds.includes(z.id));
            if (zone) pharmacyZoneId = zone.id;
          }
        }

        if (importedProducts.length > 0) {
          const region = regions.find(r => r.id === pharmacyRegionId);
          const zone = zones.find(z => z.id === pharmacyZoneId);

          await addDoc(collection(db, 'pharmacySales'), {
            pharmacyName: pharmacyName || 'Импорт қилинган',
            pharmacyAddress: pharmacyAddress || '-',
            inn: pharmacyInn || '',
            regionId: pharmacyRegionId || '',
            regionName: region?.name || '',
            zoneId: pharmacyZoneId || '',
            zoneName: zone?.name || '',
            month: pharmacyMonth,
            products: importedProducts,
            totalAmount,
            invoiceNumber: row['Номер'] || '',
            notes: row['Изоҳ'] || '',
            userId: auth.currentUser?.uid || 'anonymous',
            userEmail: auth.currentUser?.email || '',
            createdAt: serverTimestamp()
          });
          alert(importedProducts.length + ' та препарат импорт қилинди!');
        } else {
          alert('Файлда препаратлар топилмади!');
        }
      } catch (error) {
        alert('Файлни ўқишда хатолик!');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ============ EXPORT ============

  const handleExport = () => {
    let data: any[] = [];
    let fileName = '';

    if (activeTab === 'zone') {
      data = zoneSales.map((s, i) => ({
        '№': i + 1,
        'Регион': s.regionName,
        'Зона': s.zoneName,
        'Ой': s.month,
        'Препаратлар': s.products.map(p => {
          const product = products.find(pr => pr.id === p.productId);
          return product ? product.name + ' (' + p.quantity + ' дона)' : '';
        }).join('; '),
        'Жами сумма': s.totalAmount
      }));
      fileName = 'зона_сотувлари';
    } else if (activeTab === 'doctor') {
      data = doctorSales.map((s, i) => ({
        '№': i + 1,
        'Врач': s.doctorName,
        'Регион': s.doctorRegion,
        'Зона': s.doctorZone,
        'Ой': s.month,
        'Препаратлар': s.products.map(p => {
          const product = products.find(pr => pr.id === p.productId);
          return product ? product.name + ' (' + p.quantity + ')' : '';
        }).join('; '),
        'Жами сумма': s.totalAmount,
        'Комиссия': s.totalCommission
      }));
      fileName = 'врач_сотувлари';
    } else {
      data = pharmacySales.map((s, i) => ({
        '№': i + 1,
        'Аптека': s.pharmacyName,
        'ИНН': s.inn || '-',
        'Манзил': s.pharmacyAddress,
        'Регион': s.regionName,
        'Зона': s.zoneName,
        'Ой': s.month,
        'Препаратлар': s.products.map(p => {
          const product = products.find(pr => pr.id === p.productId);
          return product ? product.name + ' (' + p.quantity + ' дона)' : '';
        }).join('; '),
        'Жами сумма': s.totalAmount,
        'Номер': s.invoiceNumber || '-',
        'Изоҳ': s.notes || '-'
      }));
      fileName = 'аптека_сотувлари';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Сотувлар');
    XLSX.writeFile(wb, fileName + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  // ============ RENDER ============

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>💰 Сотувлар</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          {activeTab === 'pharmacy' && (
            <>
              <input type="file" accept=".xlsx,.xls" onChange={handlePharmacyImport} style={{ display: 'none' }} id="importFile" />
              <button onClick={() => document.getElementById('importFile')?.click()} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📥 Импорт</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e8ecf1' }}>
        <button onClick={() => setActiveTab('zone')} style={{ padding: '10px 20px', background: activeTab === 'zone' ? '#667eea' : 'transparent', color: activeTab === 'zone' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'zone' ? 'bold' : 'normal' }}>
          📍 Зона бўйича
        </button>
        <button onClick={() => setActiveTab('doctor')} style={{ padding: '10px 20px', background: activeTab === 'doctor' ? '#667eea' : 'transparent', color: activeTab === 'doctor' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'doctor' ? 'bold' : 'normal' }}>
          👨‍⚕️ Врачларга таксимлаш
        </button>
        <button onClick={() => setActiveTab('pharmacy')} style={{ padding: '10px 20px', background: activeTab === 'pharmacy' ? '#667eea' : 'transparent', color: activeTab === 'pharmacy' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'pharmacy' ? 'bold' : 'normal' }}>
          🏪 Аптека бўйича
        </button>
      </div>

      {/* ===== 1. ZONE ===== */}
      {activeTab === 'zone' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px' }}>📍 Зона бўйича сотув қўшиш</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select 
                value={selectedRegionId} 
                onChange={(e) => setSelectedRegionId(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="">Регион танланг *</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select 
                value={selectedZoneId} 
                onChange={(e) => setSelectedZoneId(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                disabled={!selectedRegionId || availableZones.length === 0}
              >
                <option value="">Зона танланг</option>
                {availableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                {selectedRegionId && availableZones.length === 0 && (
                  <option value="">Бу регионга зона бириктирилмаган</option>
                )}
              </select>
              <input type="month" value={zoneMonth} onChange={(e) => setZoneMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const product = products.find(p => p.id === e.target.value);
                    if (product) {
                      const existing = zoneProducts.find(p => p.productId === product.id);
                      if (existing) {
                        alert('Бу препарат аллақачон қўшилган!');
                        return;
                      }
                      setZoneProducts([...zoneProducts, { productId: product.id, quantity: 1 }]);
                    }
                  }
                }}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', flex: 1 }}
              >
                <option value="">➕ Препарат қўшиш</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.groupName})</option>
                ))}
              </select>
            </div>
            {zoneProducts.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', background: '#f8f9fa', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ flex: 1 }}>{product?.name} ({product?.groupName})</span>
                  <input type="number" value={item.quantity} onChange={(e) => {
                    const newProducts = [...zoneProducts];
                    newProducts[index].quantity = Number(e.target.value) || 0;
                    setZoneProducts(newProducts);
                  }} style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }} min="1" />
                  <span>упаковка</span>
                  <button onClick={() => handleRemoveZoneProduct(index)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              );
            })}
            <button onClick={handleAddZoneSale} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Сақлаш</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr><th>№</th><th>Регион</th><th>Зона</th><th>Ой</th><th>Препаратлар</th><th>Жами</th><th>Ҳаракат</th></tr>
                </thead>
                <tbody>
                  {zoneSales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{s.regionName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.zoneName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.month}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                        {s.products.map(p => {
                          const product = products.find(pr => pr.id === p.productId);
                          return product ? product.name + ' (' + p.quantity + ')' : '';
                        }).join(', ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{s.totalAmount.toLocaleString()} сўм</td>
                      <td><button onClick={() => handleDeleteZoneSale(s.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 2. DOCTOR ===== */}
      {activeTab === 'doctor' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px' }}>👨‍⚕️ Врачга таксимлаш</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <option value="">Врач танланг *</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region} - {d.zone})</option>)}
              </select>
              <input type="month" value={doctorMonth} onChange={(e) => setDoctorMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>

            <div style={{ marginBottom: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>📦 Бир нечта препарат қўшиш</div>
              {bulkProducts.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'center' }}>
                  <select
                    value={item.productId}
                    onChange={(e) => handleBulkProductChange(index, 'productId', e.target.value)}
                    style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Препарат танланг</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleBulkProductChange(index, 'quantity', Number(e.target.value) || 1)}
                    min="1"
                    style={{ width: '80px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#666' }}>упаковка</span>
                  {bulkProducts.length > 1 && (
                    <button onClick={() => removeBulkProductRow(index)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={addBulkProductRow} style={{ padding: '4px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>➕ Яна препарат</button>
                <button onClick={handleAddBulkProducts} style={{ padding: '4px 12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📥 Қўшиш</button>
              </div>
            </div>

            {doctorProducts.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', background: '#f8f9fa', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ flex: 1 }}>{product?.name} ({product?.groupName})</span>
                  <input type="number" value={item.quantity} onChange={(e) => {
                    const newProducts = [...doctorProducts];
                    newProducts[index].quantity = Number(e.target.value) || 0;
                    setDoctorProducts(newProducts);
                  }} style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }} min="1" />
                  <span>упаковка</span>
                  <button onClick={() => handleRemoveDoctorProduct(index)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              );
            })}
            <button onClick={handleAddDoctorSale} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Сақлаш</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr><th>№</th><th>Врач</th><th>Ой</th><th>Препаратлар</th><th>Жами</th><th>Комиссия</th><th>Ҳаракат</th></tr>
                </thead>
                <tbody>
                  {doctorSales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{s.doctorName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.month}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                        {s.products.map(p => {
                          const product = products.find(pr => pr.id === p.productId);
                          return product ? product.name + ' (' + p.quantity + ')' : '';
                        }).join(', ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{s.totalAmount.toLocaleString()} сўм</td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#2ecc71' }}>{s.totalCommission.toLocaleString()} сўм</td>
                      <td><button onClick={() => handleDeleteDoctorSale(s.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3. PHARMACY ===== */}
      {activeTab === 'pharmacy' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px' }}>🏪 Аптека бўйича савдо қўшиш</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="text" placeholder="Аптека номи *" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="text" placeholder="Манзил" value={pharmacyAddress} onChange={(e) => setPharmacyAddress(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="text" placeholder="ИНН" value={pharmacyInn} onChange={(e) => setPharmacyInn(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button onClick={() => {
                if (pharmacyInn && PHARMACY_INN_DB[pharmacyInn]) {
                  const data = PHARMACY_INN_DB[pharmacyInn];
                  const region = regions.find(r => r.name === data.region);
                  if (region) {
                    setPharmacyRegionId(region.id);
                    const zone = zones.find(z => z.name === data.zone && region.zoneIds.includes(z.id));
                    if (zone) setPharmacyZoneId(zone.id);
                  }
                  alert('ИНН бўйича маълумот топилди: ' + data.region + ', ' + data.zone);
                } else if (pharmacyInn) {
                  alert('ИНН бўйича маълумот топилмади!');
                }
              }} style={{ padding: '8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔍 ИНН текшириш</button>
              <input type="month" value={pharmacyMonth} onChange={(e) => setPharmacyMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select 
                value={pharmacyRegionId} 
                onChange={(e) => setPharmacyRegionId(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="">Регион танланг</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select 
                value={pharmacyZoneId} 
                onChange={(e) => setPharmacyZoneId(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                disabled={!pharmacyRegionId || pharmacyAvailableZones.length === 0}
              >
                <option value="">Зона танланг</option>
                {pharmacyAvailableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                {pharmacyRegionId && pharmacyAvailableZones.length === 0 && (
                  <option value="">Бу регионга зона бириктирилмаган</option>
                )}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="text" placeholder="Счет-фактура №" value={pharmacyInvoice} onChange={(e) => setPharmacyInvoice(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="text" placeholder="Изоҳ" value={pharmacyNotes} onChange={(e) => setPharmacyNotes(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const product = products.find(p => p.id === e.target.value);
                    if (product) {
                      const existing = pharmacyProducts.find(p => p.productId === product.id);
                      if (existing) {
                        alert('Бу препарат аллақачон қўшилган!');
                        return;
                      }
                      setPharmacyProducts([...pharmacyProducts, { productId: product.id, quantity: 1 }]);
                    }
                  }
                }}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', flex: 1 }}
              >
                <option value="">➕ Препарат қўшиш</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.groupName})</option>
                ))}
              </select>
            </div>
            {pharmacyProducts.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', background: '#f8f9fa', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ flex: 1 }}>{product?.name} ({product?.groupName})</span>
                  <input type="number" value={item.quantity} onChange={(e) => {
                    const newProducts = [...pharmacyProducts];
                    newProducts[index].quantity = Number(e.target.value) || 0;
                    setPharmacyProducts(newProducts);
                  }} style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }} min="1" />
                  <span>упаковка</span>
                  <button onClick={() => handleRemovePharmacyProduct(index)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              );
            })}
            <button onClick={handleAddPharmacySale} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Сақлаш</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr><th>№</th><th>Аптека</th><th>ИНН</th><th>Регион</th><th>Зона</th><th>Ой</th><th>Препаратлар</th><th>Жами</th><th>Ҳаракат</th></tr>
                </thead>
                <tbody>
                  {pharmacySales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{s.pharmacyName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.inn || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{s.regionName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.zoneName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.month}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                        {s.products.map(p => {
                          const product = products.find(pr => pr.id === p.productId);
                          return product ? product.name + ' (' + p.quantity + ')' : '';
                        }).join(', ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{s.totalAmount.toLocaleString()} сўм</td>
                      <td><button onClick={() => handleDeletePharmacySale(s.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
