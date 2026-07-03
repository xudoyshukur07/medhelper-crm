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
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface ProductGroup {
  id: string;
  name: string;
  isActive: boolean;
}

const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageProducts = user?.role === 'superadmin' || user?.role === 'seo' || user?.role === 'pm' || user?.role === 'ffm';

  const [formData, setFormData] = useState({
    name: '',
    groupId: '',
    barcode: '',
    price: 0,
    packaging: 'дона',
    dosage: '',
    composition: '',
    commissionAmount: 0,
    usage: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    const q = query(collection(db, 'productGroups'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProductGroup));
      setGroups(data);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      setError('Xatolik: ' + error.message);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canManageProducts) {
      setError('Сизда препарат қўшиш ҳуқуқи йўқ!');
      return;
    }

    if (!formData.name.trim() || !formData.groupId || !formData.price) {
      setError('Номи, гуруҳ ва нархи мажбурий!');
      return;
    }

    const group = groups.find(g => g.id === formData.groupId);

    try {
      await addDoc(collection(db, 'products'), {
        name: formData.name,
        groupId: formData.groupId,
        groupName: group?.name || '',
        barcode: formData.barcode || '',
        price: formData.price,
        packaging: formData.packaging || 'дона',
        dosage: formData.dosage || '',
        composition: formData.composition || '',
        commissionAmount: formData.commissionAmount || 0,
        usage: formData.usage || '',
        description: formData.description || '',
        isActive: formData.isActive,
        salesCount: 0,
        aiScore: 0,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp()
      });
      setSuccess('Препарат кушилди!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    if (!canManageProducts) {
      setError('Сизда препарат таҳрирлаш ҳуқуқи йўқ!');
      return;
    }

    const group = groups.find(g => g.id === formData.groupId);

    try {
      await updateDoc(doc(db, 'products', editingId), {
        name: formData.name,
        groupId: formData.groupId,
        groupName: group?.name || '',
        barcode: formData.barcode || '',
        price: formData.price,
        packaging: formData.packaging || 'дона',
        dosage: formData.dosage || '',
        composition: formData.composition || '',
        commissionAmount: formData.commissionAmount || 0,
        usage: formData.usage || '',
        description: formData.description || '',
        isActive: formData.isActive,
        updatedAt: serverTimestamp()
      });
      setSuccess('Препарат янгиланди!');
      setEditingId(null);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!canManageProducts) {
      setError('Сизда препарат ўчириш ҳуқуқи йўқ!');
      return;
    }
    if (!confirm('Ушбу препаратни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setSuccess('Препарат учирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      groupId: '',
      barcode: '',
      price: 0,
      packaging: 'дона',
      dosage: '',
      composition: '',
      commissionAmount: 0,
      usage: '',
      description: '',
      isActive: true
    });
    setEditingId(null);
  };

  const handleEditProduct = (product: Product) => {
    if (!canManageProducts) {
      setError('Сизда препарат таҳрирлаш ҳуқуқи йўқ!');
      return;
    }
    setEditingId(product.id);
    setFormData({
      name: product.name,
      groupId: product.groupId,
      barcode: product.barcode || '',
      price: product.price,
      packaging: product.packaging || 'дона',
      dosage: product.dosage || '',
      composition: product.composition || '',
      commissionAmount: product.commissionAmount || 0,
      usage: product.usage || '',
      description: product.description || '',
      isActive: product.isActive !== undefined ? product.isActive : true
    });
    setShowModal(true);
  };

  // ============ IMPORT FROM EXCEL ============

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('Fayl tanlanmagan!');
      return;
    }

    if (!canManageProducts) {
      setError('Сизда препарат импорт қилиш ҳуқуқи йўқ!');
      e.target.value = '';
      return;
    }

    setImportLoading(true);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (!jsonData || jsonData.length === 0) {
          setError('Файлда маълумот топилмади!');
          setImportLoading(false);
          e.target.value = '';
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of jsonData) {
          const name = row['Номи'] || row['Name'] || row['Препарат'] || row['Название'] || '';
          const groupName = row['Гуруҳ'] || row['Group'] || row['Категория'] || row['Группа'] || '';
          const price = Number(row['Нархи (сўм)'] || row['Price'] || row['Нархи'] || row['Цена'] || 0);
          const barcode = String(row['Штрих-код'] || row['Barcode'] || row['Штрихкод'] || '');
          const packaging = row['Упаковка'] || row['Packaging'] || 'дона';
          const dosage = row['Дозировка'] || row['Dosage'] || '';
          const composition = row['Таркиби'] || row['Composition'] || '';
          const commissionAmount = Number(row['Комиссия (сўм)'] || row['Commission'] || row['Комиссия'] || row['Комиссионные'] || 0);
          const usage = row['Қўлланиши'] || row['Usage'] || '';
          const description = row['Изоҳ'] || row['Description'] || '';
          const isActive = row['Ҳолат'] === 'Фаол' || row['Status'] === 'Active' || row['Холат'] === 'Актив' || true;

          if (!name || !price || price <= 0) {
            skippedCount++;
            continue;
          }

          let groupId = '';
          let groupNameFinal = '';

          if (groupName) {
            const existingGroup = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            if (existingGroup) {
              groupId = existingGroup.id;
              groupNameFinal = existingGroup.name;
            } else {
              try {
                const newGroupRef = await addDoc(collection(db, 'productGroups'), {
                  name: groupName,
                  isActive: true,
                  userId: auth.currentUser?.uid || 'anonymous',
                  createdAt: serverTimestamp()
                });
                groupId = newGroupRef.id;
                groupNameFinal = groupName;
                
                const snapshot = await getDocs(query(collection(db, 'productGroups'), where('isActive', '==', true)));
                const updatedGroups = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                } as ProductGroup));
                setGroups(updatedGroups);
              } catch (err) {
                skippedCount++;
                continue;
              }
            }
          }

          try {
            await addDoc(collection(db, 'products'), {
              name: name,
              groupId: groupId,
              groupName: groupNameFinal || '',
              barcode: barcode || '',
              price: price,
              packaging: packaging || 'дона',
              dosage: dosage || '',
              composition: composition || '',
              commissionAmount: commissionAmount || 0,
              usage: usage || '',
              description: description || '',
              isActive: isActive,
              salesCount: 0,
              aiScore: 0,
              userId: auth.currentUser?.uid || 'anonymous',
              userEmail: auth.currentUser?.email || '',
              createdAt: serverTimestamp()
            });
            importedCount++;
          } catch (err) {
            skippedCount++;
          }
        }

        setImportLoading(false);
        e.target.value = '';
        
        if (importedCount > 0) {
          let msg = importedCount + ' та препарат импорт қилинди!';
          if (skippedCount > 0) {
            msg = msg + ' (' + skippedCount + ' та ўтказиб юборилди)';
          }
          setSuccess(msg);
        } else {
          setError('Импорт қилиш учун тўғри маълумот топилмади!');
        }
      } catch (error) {
        console.error('Импорт хатолиги:', error);
        setError('Файлни ўқишда хатолик юз берди.');
        setImportLoading(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setError('Faylni o\'qishda xatolik yuz berdi!');
      setImportLoading(false);
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.groupName && p.groupName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = selectedGroup === 'all' || p.groupId === selectedGroup;
    return matchSearch && matchGroup;
  });

  const handleExport = () => {
    const data = filteredProducts.map((p, index) => ({
      '№': index + 1,
      'Номи': p.name,
      'Гуруҳ': p.groupName || '-',
      'Штрих-код': p.barcode || '-',
      'Нархи (сўм)': p.price,
      'Упаковка': p.packaging,
      'Дозировка': p.dosage || '-',
      'Таркиби': p.composition || '-',
      'Комиссия (сўм)': p.commissionAmount,
      'Қўлланиши': p.usage || '-',
      'Сотувлар': p.salesCount || 0,
      'AI рейтинг': p.aiScore || 0,
      'Ҳолат': p.isActive ? 'Фаол' : 'Фаол эмас'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Препаратлар');
    XLSX.writeFile(wb, 'препаратлар_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}
      {importLoading && <div style={{ background: '#cce5ff', color: '#004085', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>⏳ Импорт қилинмоқда...</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>💊 Препаратлар ({products.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="🔍 Қидириш..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }} />
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
            <option value="all">📋 Барча гуруҳлар</option>
            {groups.filter(g => g.isActive).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
          
          <label style={{ padding: '8px 16px', background: canManageProducts ? '#2ecc71' : '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: canManageProducts ? 'pointer' : 'not-allowed', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: canManageProducts ? 1 : 0.6 }}>
            📥 Импорт
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} ref={fileInputRef} style={{ display: 'none' }} disabled={!canManageProducts} />
          </label>
          
          <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          {canManageProducts && (<button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>➕ Препарат қўшиш</button>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>📦 Жами</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>{products.length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>✅ Фаол</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2ecc71' }}>{products.filter(p => p.isActive).length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>❌ Фаол эмас</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>{products.filter(p => !p.isActive).length}</div>
        </div>
        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>📊 Гуруҳлар</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>{groups.length}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>№</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Номи</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Гуруҳ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Нархи</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Комиссия</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Упаковка</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>AI</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳолат</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳаракатлар</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>📭 Ҳеч қандай препарат топилмади</td></tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: '#e8ecf1', fontSize: '12px' }}>{product.groupName || '-'}</span></td>
                    <td style={{ padding: '10px 14px' }}>{product.price.toLocaleString()} сўм</td>
                    <td style={{ padding: '10px 14px' }}>{product.commissionAmount.toLocaleString()} сўм</td>
                    <td style={{ padding: '10px 14px' }}>{product.packaging}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: (product.aiScore || 0) >= 80 ? '#d4edda' : (product.aiScore || 0) >= 60 ? '#fff3cd' : '#f8d7da', color: (product.aiScore || 0) >= 80 ? '#155724' : (product.aiScore || 0) >= 60 ? '#856404' : '#721c24', fontSize: '12px', fontWeight: 'bold' }}>
                        {product.aiScore || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: product.isActive ? '#d4edda' : '#f8d7da', color: product.isActive ? '#155724' : '#721c24', fontSize: '12px' }}>
                        {product.isActive ? '✅ Фаол' : '❌ Фаол эмас'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {canManageProducts && (
                        <>
                          <button onClick={() => handleEditProduct(product)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                          <button onClick={() => handleDeleteProduct(product.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Препаратни таҳрирлаш' : '➕ Янги препарат қўшиш'}</h3>
            <form onSubmit={editingId ? handleUpdateProduct : handleAddProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Гуруҳ *</label><select value={formData.groupId} onChange={(e) => setFormData({...formData, groupId: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}><option value="">Танланг</option>{groups.filter(g => g.isActive).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Штрих-код</label><input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Нархи (сўм) *</label><input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Упаковка</label><select value={formData.packaging} onChange={(e) => setFormData({...formData, packaging: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}><option value="дона">Дона</option><option value="флакон">Флакон</option><option value="ампула">Ампула</option><option value="блистер">Блистер</option><option value="порошок">Порошок</option></select></div>
                <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Дозировка</label><input type="text" value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})} placeholder="500 мг, 30 мл" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              </div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Таркиби</label><input type="text" value={formData.composition} onChange={(e) => setFormData({...formData, composition: e.target.value})} placeholder="Актив моддалар" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Комиссия (сўм) *</label><input type="number" value={formData.commissionAmount} onChange={(e) => setFormData({...formData, commissionAmount: Number(e.target.value)})} required min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Қўлланиши</label><input type="text" value={formData.usage} onChange={(e) => setFormData({...formData, usage: e.target.value})} placeholder="Қандай ишлатиш" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Изоҳ</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} /></div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label><select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}><option value="true">✅ Фаол</option><option value="false">❌ Фаол эмас</option></select></div>
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

export default Products;
