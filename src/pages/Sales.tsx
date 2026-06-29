import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface ZoneSales {
  id: string;
  region: string;
  district: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DoctorSales {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorRegion: string;
  doctorDistrict: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  totalCommission: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PharmacySales {
  id: string;
  pharmacyName: string;
  pharmacyAddress: string;
  inn: string;
  region: string;
  district: string;
  month: string;
  products: { productId: string; quantity: number }[];
  totalAmount: number;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  district: string;
}

const PHARMACY_INN_DB: { [key: string]: { region: string; district: string } } = {
  '123456789': { region: 'Тошкент', district: 'Чилонзор' },
  '987654321': { region: 'Тошкент', district: 'Яккасарой' },
  '456789123': { region: 'Самарқанд', district: 'Самарқанд ш.' },
  '789123456': { region: 'Самарқанд', district: 'Булунғур' },
  '321654987': { region: 'Тошкент', district: 'Миробод' },
};

const Sales: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'zone' | 'doctor' | 'pharmacy'>('zone');
  
  const [zoneSales, setZoneSales] = useState<ZoneSales[]>([]);
  const [zoneProducts, setZoneProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [zoneMonth, setZoneMonth] = useState(new Date().toISOString().slice(0, 7));
  const [zoneRegion, setZoneRegion] = useState('');
  const [zoneDistrict, setZoneDistrict] = useState('');
  
  const [doctorSales, setDoctorSales] = useState<DoctorSales[]>([]);
  const [doctorProducts, setDoctorProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [doctorMonth, setDoctorMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bulkProducts, setBulkProducts] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 }
  ]);
  
  const [pharmacySales, setPharmacySales] = useState<PharmacySales[]>([]);
  const [pharmacyProducts, setPharmacyProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [pharmacyMonth, setPharmacyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyInn, setPharmacyInn] = useState('');
  const [pharmacyRegion, setPharmacyRegion] = useState('');
  const [pharmacyDistrict, setPharmacyDistrict] = useState('');
  const [pharmacyInvoice, setPharmacyInvoice] = useState('');
  const [pharmacyNotes, setPharmacyNotes] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      if (user.groupId) {
        setUserGroups([user.groupId]);
      }
      if (user.region) {
        setZoneRegion(user.region);
      }
      if (user.district) {
        setZoneDistrict(user.district);
      }
    }
  }, [user]);

  useEffect(() => {
    const demoProducts: Product[] = [
      { id: '1', name: 'Амаредетрим', groupId: '1', groupName: 'Vita', price: 150000, commissionAmount: 15000 },
      { id: '2', name: 'Ферсикард', groupId: '2', groupName: 'Forte', price: 200000, commissionAmount: 24000 },
      { id: '3', name: 'Долмасто', groupId: '2', groupName: 'Forte', price: 180000, commissionAmount: 18000 },
      { id: '4', name: 'Репродуктол', groupId: '1', groupName: 'Vita', price: 250000, commissionAmount: 37500 },
      { id: '5', name: 'Кардио-препарат', groupId: '3', groupName: 'Cardio', price: 300000, commissionAmount: 30000 },
      { id: '6', name: 'Нейро-препарат', groupId: '4', groupName: 'Neuro', price: 280000, commissionAmount: 28000 },
    ];
    setProducts(demoProducts);

    const demoDoctors: Doctor[] = [
      { id: '1', name: 'Алимов Али', region: 'Тошкент', district: 'Чилонзор' },
      { id: '2', name: 'Тангриберганова Дилдора', region: 'Тошкент', district: 'Яккасарой' },
      { id: '3', name: 'Ибрагимов Гани', region: 'Тошкент', district: 'Миробод' },
      { id: '4', name: 'Каримова Нигора', region: 'Самарқанд', district: 'Самарқанд ш.' },
    ];
    setDoctors(demoDoctors);

    setLoading(false);
  }, []);

  const getUserProducts = () => {
    let filtered = products;
    if (userGroups.length > 0) {
      filtered = filtered.filter(p => userGroups.includes(p.groupId));
    }
    if (user?.role === 'superadmin' || user?.role === 'ceo') {
      return products;
    }
    return filtered;
  };

  const getUserDoctors = () => {
    if (user?.role === 'superadmin' || user?.role === 'ceo') {
      return doctors;
    }
    if (user?.region) {
      return doctors.filter(d => d.region === user.region);
    }
    return doctors;
  };

  const availableProducts = getUserProducts();
  const availableDoctors = getUserDoctors();

  // Зона
  const handleAddZoneSale = () => {
    if (!zoneRegion || zoneProducts.length === 0) {
      alert('Вилоят ва камида 1 та препарат киритинг!');
      return;
    }
    const totalAmount = zoneProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.price || 0) * p.quantity;
    }, 0);

    const newSale: ZoneSales = {
      id: Date.now().toString(),
      region: zoneRegion,
      district: zoneDistrict || 'Барча туманлар',
      month: zoneMonth,
      products: zoneProducts,
      totalAmount,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setZoneSales([...zoneSales, newSale]);
    setZoneProducts([]);
    alert('Зона сотуви сақланди!');
  };

  const handleRemoveZoneProduct = (index: number) => {
    setZoneProducts(zoneProducts.filter((_, i) => i !== index));
  };

  // Врач
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

  const handleAddDoctorSale = () => {
    if (!selectedDoctor || doctorProducts.length === 0) {
      alert('Врач ва камида 1 та препарат киритинг!');
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

    const newSale: DoctorSales = {
      id: Date.now().toString(),
      doctorId: selectedDoctor,
      doctorName: doctor?.name || '',
      doctorRegion: doctor?.region || '',
      doctorDistrict: doctor?.district || '',
      month: doctorMonth,
      products: doctorProducts,
      totalAmount,
      totalCommission,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDoctorSales([...doctorSales, newSale]);
    setDoctorProducts([]);
    alert('Врач сотуви сақланди!');
  };

  const handleRemoveDoctorProduct = (index: number) => {
    setDoctorProducts(doctorProducts.filter((_, i) => i !== index));
  };

  // Аптека
  const handlePharmacyInnCheck = () => {
    if (pharmacyInn && PHARMACY_INN_DB[pharmacyInn]) {
      const data = PHARMACY_INN_DB[pharmacyInn];
      setPharmacyRegion(data.region);
      setPharmacyDistrict(data.district);
      alert('ИНН бўйича маълумот топилди: ' + data.region + ', ' + data.district);
    } else if (pharmacyInn) {
      alert('ИНН бўйича маълумот топилмади!');
    }
  };

  const handleAddPharmacySale = () => {
    if (!pharmacyName || pharmacyProducts.length === 0) {
      alert('Аптека номи ва камида 1 та препарат киритинг!');
      return;
    }
    const totalAmount = pharmacyProducts.reduce((sum, p) => {
      const product = products.find(pr => pr.id === p.productId);
      return sum + (product?.price || 0) * p.quantity;
    }, 0);

    const newSale: PharmacySales = {
      id: Date.now().toString(),
      pharmacyName,
      pharmacyAddress: pharmacyAddress || '-',
      inn: pharmacyInn || '',
      region: pharmacyRegion || user?.region || '-',
      district: pharmacyDistrict || user?.district || '-',
      month: pharmacyMonth,
      products: pharmacyProducts,
      totalAmount,
      invoiceNumber: pharmacyInvoice || '',
      notes: pharmacyNotes || '',
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPharmacySales([...pharmacySales, newSale]);
    setPharmacyProducts([]);
    setPharmacyName('');
    setPharmacyAddress('');
    setPharmacyInn('');
    setPharmacyRegion('');
    setPharmacyDistrict('');
    setPharmacyInvoice('');
    setPharmacyNotes('');
    alert('Аптека сотуви сақланди!');
  };

  const handleRemovePharmacyProduct = (index: number) => {
    setPharmacyProducts(pharmacyProducts.filter((_, i) => i !== index));
  };

  // Excel импорт
  const handlePharmacyImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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
        let pharmacyRegion = '';
        let pharmacyDistrict = '';

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

        if (pharmacyInn && PHARMACY_INN_DB[pharmacyInn]) {
          const loc = PHARMACY_INN_DB[pharmacyInn];
          pharmacyRegion = loc.region;
          pharmacyDistrict = loc.district;
        }

        if (importedProducts.length > 0) {
          const newSale: PharmacySales = {
            id: Date.now().toString(),
            pharmacyName: pharmacyName || 'Импорт қилинган',
            pharmacyAddress: pharmacyAddress || '-',
            inn: pharmacyInn || '',
            region: pharmacyRegion || user?.region || '-',
            district: pharmacyDistrict || user?.district || '-',
            month: pharmacyMonth,
            products: importedProducts,
            totalAmount,
            invoiceNumber: row['Номер'] || '',
            notes: row['Изоҳ'] || '',
            createdBy: user?.id || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setPharmacySales([...pharmacySales, newSale]);
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

  // Excel экспорт
  const handleExport = () => {
    let data: any[] = [];
    let fileName = '';

    if (activeTab === 'zone') {
      data = zoneSales.map((s, i) => ({
        '№': i + 1,
        'Вилоят': s.region,
        'Туман': s.district,
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
        'Вилоят': s.doctorRegion,
        'Туман': s.doctorDistrict,
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
        'Вилоят': s.region,
        'Туман': s.district,
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

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
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

      {/* Таблар */}
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

      {/* ===== 1-ҚИСМ: ЗОНА ===== */}
      {activeTab === 'zone' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px' }}>📍 Зона бўйича сотув қўшиш</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="text" placeholder="Вилоят *" value={zoneRegion} onChange={(e) => setZoneRegion(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="text" placeholder="Туман" value={zoneDistrict} onChange={(e) => setZoneDistrict(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="month" value={zoneMonth} onChange={(e) => setZoneMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const product = availableProducts.find(p => p.id === e.target.value);
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
                {availableProducts.filter(p => !zoneProducts.find(z => z.productId === p.id)).map(p => (
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
                  <tr><th>№</th><th>Вилоят</th><th>Туман</th><th>Ой</th><th>Препаратлар</th><th>Жами</th></tr>
                </thead>
                <tbody>
                  {zoneSales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{s.region}</td>
                      <td style={{ padding: '8px 12px' }}>{s.district}</td>
                      <td style={{ padding: '8px 12px' }}>{s.month}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                        {s.products.map(p => {
                          const product = products.find(pr => pr.id === p.productId);
                          return product ? product.name + ' (' + p.quantity + ')' : '';
                        }).join(', ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{s.totalAmount.toLocaleString()} сўм</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 2-ҚИСМ: ВРАЧ ===== */}
      {activeTab === 'doctor' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px' }}>👨‍⚕️ Врачга таксимлаш</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <option value="">Врач танланг *</option>
                {availableDoctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region})</option>)}
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
                    {availableProducts.filter(p => !doctorProducts.find(z => z.productId === p.id) && !bulkProducts.some(b => b.productId === p.id && b !== item)).map(p => (
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
                  <tr><th>№</th><th>Врач</th><th>Ой</th><th>Препаратлар</th><th>Жами</th><th>Комиссия</th></tr>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3-ҚИСМ: АПТЕКА ===== */}
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
              <button onClick={handlePharmacyInnCheck} style={{ padding: '8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔍 ИНН текшириш</button>
              <input type="month" value={pharmacyMonth} onChange={(e) => setPharmacyMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="text" placeholder="Вилоят" value={pharmacyRegion} onChange={(e) => setPharmacyRegion(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="text" placeholder="Туман" value={pharmacyDistrict} onChange={(e) => setPharmacyDistrict(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
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
                    const product = availableProducts.find(p => p.id === e.target.value);
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
                {availableProducts.filter(p => !pharmacyProducts.find(z => z.productId === p.id)).map(p => (
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
                  <tr><th>№</th><th>Аптека</th><th>ИНН</th><th>Вилоят</th><th>Туман</th><th>Ой</th><th>Препаратлар</th><th>Жами</th></tr>
                </thead>
                <tbody>
                  {pharmacySales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{s.pharmacyName}</td>
                      <td style={{ padding: '8px 12px' }}>{s.inn || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{s.region}</td>
                      <td style={{ padding: '8px 12px' }}>{s.district}</td>
                      <td style={{ padding: '8px 12px' }}>{s.month}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                        {s.products.map(p => {
                          const product = products.find(pr => pr.id === p.productId);
                          return product ? product.name + ' (' + p.quantity + ')' : '';
                        }).join(', ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{s.totalAmount.toLocaleString()} сўм</td>
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
