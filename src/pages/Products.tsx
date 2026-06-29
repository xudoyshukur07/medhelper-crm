import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

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
    const demoGroups: ProductGroup[] = [
      { id: '1', name: 'Vita', isActive: true },
      { id: '2', name: 'Forte', isActive: true },
      { id: '3', name: 'Cardio', isActive: true },
      { id: '4', name: 'Neuro', isActive: true },
      { id: '5', name: 'Gastro', isActive: true },
    ];
    setGroups(demoGroups);

    const demoProducts: Product[] = [
      { 
        id: '1', 
        name: 'Амаредетрим', 
        groupId: '1', 
        groupName: 'Vita', 
        barcode: '8600123456789',
        price: 150000, 
        packaging: 'дона',
        dosage: '500 мг',
        composition: 'Витамин С, D, B12',
        commissionAmount: 15000,
        salesCount: 45, 
        aiScore: 95, 
        usage: 'Овқатдан кейин 1 дона',
        description: 'Витамин комплекси', 
        isActive: true,
        createdBy: '1',
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
      { 
        id: '2', 
        name: 'Ферсикард', 
        groupId: '2', 
        groupName: 'Forte', 
        barcode: '8600234567890',
        price: 200000, 
        packaging: 'флакон',
        dosage: '30 мл',
        composition: 'Феррум, кардио комплекс',
        commissionAmount: 24000,
        salesCount: 30, 
        aiScore: 88, 
        usage: 'Кунда 1 марта 10 мл',
        description: 'Кучли таъсирли препарат', 
        isActive: true,
        createdBy: '1',
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
    ];
    setProducts(demoProducts);
    setLoading(false);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.groupName && p.groupName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = selectedGroup === 'all' || p.groupId === selectedGroup;
    return matchSearch && matchGroup;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts) {
      alert('Сизда препарат қўшиш ҳуқуқи йўқ!');
      return;
    }
    const group = groups.find(g => g.id === formData.groupId);
    const newProduct: Product = {
      id: Date.now().toString(),
      ...formData,
      groupName: group?.name || '',
      salesCount: 0,
      aiScore: 0,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProducts([...products, newProduct]);
    setShowModal(false);
    resetForm();
  };

  const handleEditProduct = (product: Product) => {
    if (!canManageProducts) {
      alert('Сизда препарат таҳрирлаш ҳуқуқи йўқ!');
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
      commissionAmount: product.commissionAmount,
      usage: product.usage || '',
      description: product.description || '',
      isActive: product.isActive
    });
    setShowModal(true);
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const group = groups.find(g => g.id === formData.groupId);
    setProducts(products.map(p =>
      p.id === editingId ? {
        ...p,
        ...formData,
        groupName: group?.name || '',
        updatedAt: new Date().toISOString()
      } : p
    ));
    setEditingId(null);
    setShowModal(false);
    resetForm();
  };

  const handleDeleteProduct = (id: string) => {
    if (!canManageProducts) {
      alert('Сизда препарат ўчириш ҳуқуқи йўқ!');
      return;
    }
    if (!confirm('Ушбу препаратни ўчирамизми?')) return;
    setProducts(products.filter(p => p.id !== id));
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
  };

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
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>💊 Препаратлар ({products.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
          />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="all">📋 Барча гуруҳлар</option>
            {groups.filter(g => g.isActive).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📤 Экспорт
          </button>
          {canManageProducts && (
            <button
              onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              ➕ Препарат қўшиш
            </button>
          )}
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
                <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай препарат топилмади</td></tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#e8ecf1', fontSize: '12px' }}>{product.groupName || '-'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{product.price.toLocaleString()} сўм</td>
                    <td style={{ padding: '10px 14px' }}>{product.commissionAmount.toLocaleString()} сўм</td>
                    <td style={{ padding: '10px 14px' }}>{product.packaging}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: (product.aiScore || 0) >= 80 ? '#d4edda' : (product.aiScore || 0) >= 60 ? '#fff3cd' : '#f8d7da',
                        color: (product.aiScore || 0) >= 80 ? '#155724' : (product.aiScore || 0) >= 60 ? '#856404' : '#721c24',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {product.aiScore || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: product.isActive ? '#d4edda' : '#f8d7da',
                        color: product.isActive ? '#155724' : '#721c24',
                        fontSize: '12px'
                      }}>
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
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Гуруҳ *</label>
                  <select value={formData.groupId} onChange={(e) => setFormData({...formData, groupId: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="">Танланг</option>
                    {groups.filter(g => g.isActive).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Штрих-код</label>
                  <input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Нархи (сўм) *</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Упаковка</label>
                  <select value={formData.packaging} onChange={(e) => setFormData({...formData, packaging: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="дона">Дона</option>
                    <option value="флакон">Флакон</option>
                    <option value="ампула">Ампула</option>
                    <option value="блистер">Блистер</option>
                    <option value="порошок">Порошок</option>
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Дозировка</label>
                  <input type="text" value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})} placeholder="500 мг, 30 мл" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Таркиби</label>
                <input type="text" value={formData.composition} onChange={(e) => setFormData({...formData, composition: e.target.value})} placeholder="Актив моддалар" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Комиссия (сўм) *</label>
                <input type="number" value={formData.commissionAmount} onChange={(e) => setFormData({...formData, commissionAmount: Number(e.target.value)})} required min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Қўлланиши</label>
                <input type="text" value={formData.usage} onChange={(e) => setFormData({...formData, usage: e.target.value})} placeholder="Қандай ишлатиш" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Изоҳ</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="true">✅ Фаол</option>
                  <option value="false">❌ Фаол эмас</option>
                </select>
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

export default Products;
