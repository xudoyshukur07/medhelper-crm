import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore';

// ============================================================
// INTERFACES
// ============================================================

interface Template {
  id: string;
  name: string;
  productIds: string[];
  productNames: string[];
  specialities: string[];
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt?: any;
}

interface Product {
  id: string;
  name: string;
  isActive: boolean;
}

interface Doctor {
  id: string;
  name: string;
  speciality: string;
  isActive: boolean;
}

// ============================================================
// YORDAMCHI FUNKSIYALAR
// ============================================================

const extractSpecialities = (doctors: Doctor[]): string[] => {
  const specialities = doctors
    .map(d => d.speciality)
    .filter(Boolean);
  return [...new Set(specialities)];
};

const Templates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    name: '',
    productIds: [] as string[],
    specialities: [] as string[]
  });
  const [allSpecialities, setAllSpecialities] = useState<string[]>([]);

  const canManage = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'seo';

  // ============================================================
  // MA'LUMOTLARNI YUKLASH
  // ============================================================

  // Shablonlar
  useEffect(() => {
    const q = query(collection(db, 'templates'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));
      setTemplates(data);
      console.log('✅ Shablonlar yuklandi:', data.length, 'ta');
    }, (error) => {
      console.error('❌ Shablonlar yuklashda xatolik:', error);
    });
    return unsubscribe;
  }, []);

  // Preparatlar
  useEffect(() => {
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(data);
      console.log('✅ Preparatlar yuklandi:', data.length, 'ta');
    }, (error) => {
      console.error('❌ Preparatlar yuklashda xatolik:', error);
    });
    return unsubscribe;
  }, []);

  // Doctorlar (mutaxassisliklar uchun)
  useEffect(() => {
    const q = query(collection(db, 'doctors'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Doctor));
      setDoctors(data);
      const specialities = extractSpecialities(data);
      setAllSpecialities(specialities);
      setLoading(false);
      console.log('✅ Doctorlar yuklandi:', data.length, 'ta');
      console.log('📋 Mutaxassisliklar:', specialities);
    }, (error) => {
      console.error('❌ Doctorlar yuklashda xatolik:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ============================================================
  // CRUD FUNKSIYALARI
  // ============================================================

  // Shablon saqlash
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Shablon nomini kiriting!');
      return;
    }
    if (formData.productIds.length === 0) {
      alert('Hech bo\'lmaganda bitta preparat tanlang!');
      return;
    }
    if (formData.specialities.length === 0) {
      alert('Hech bo\'lmaganda bitta mutaxassislik tanlang!');
      return;
    }

    const productNames = formData.productIds
      .map(id => products.find(p => p.id === id)?.name || '')
      .filter(Boolean);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'templates', editingId), {
          name: formData.name,
          productIds: formData.productIds,
          productNames: productNames,
          specialities: formData.specialities,
          updatedAt: serverTimestamp()
        });
        alert('✅ Shablon yangilandi!');
      } else {
        await addDoc(collection(db, 'templates'), {
          name: formData.name,
          productIds: formData.productIds,
          productNames: productNames,
          specialities: formData.specialities,
          isActive: true,
          createdBy: user?.uid || '',
          createdByName: user?.name || '',
          createdAt: serverTimestamp()
        });
        alert('✅ Shablon yaratildi!');
      }
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Xatolik:', error);
      alert('❌ Xatolik: ' + error.message);
    }
  };

  // Shablonni faollashtirish
  const handleActivate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'templates', id), { 
        isActive: true,
        updatedAt: serverTimestamp()
      });
      alert('✅ Shablon faollashtirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  // Shablonni faolsizlantirish
  const handleDeactivate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'templates', id), { 
        isActive: false,
        updatedAt: serverTimestamp()
      });
      alert('✅ Shablon faolsizlantirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  // Shablonni o'chirish
  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu shablonni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
      alert('✅ Shablon o\'chirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  // Shablonni tahrirlash
  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      productIds: template.productIds || [],
      specialities: template.specialities || []
    });
    setShowModal(true);
  };

  // Shablon nusxalash
  const handleDuplicate = (template: Template) => {
    setEditingId(null);
    setFormData({
      name: template.name + ' (nusxa)',
      productIds: template.productIds || [],
      specialities: template.specialities || []
    });
    setShowModal(true);
  };

  // Formani tozalash
  const resetForm = () => {
    setFormData({ 
      name: '', 
      productIds: [], 
      specialities: [] 
    });
    setEditingId(null);
  };

  // ============================================================
  // FILTRLASH
  // ============================================================

  const getFilteredTemplates = () => {
    let filtered = templates;

    // Status bo'yicha filtr
    if (filterStatus === 'active') {
      filtered = filtered.filter(t => t.isActive === true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(t => t.isActive === false);
    }

    // Qidiruv bo'yicha filtr
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.productNames?.some(p => p.toLowerCase().includes(term)) ||
        t.specialities?.some(s => s.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const filteredTemplates = getFilteredTemplates();

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0 }}>📋 Shablonlar ({filteredTemplates.length})</h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Qidiruv */}
          <input
            type="text"
            placeholder="🔍 Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '14px',
              width: '180px'
            }}
          />
          
          {/* Status filtri */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '14px'
            }}
          >
            <option value="all">📋 Barcha</option>
            <option value="active">✅ Faol</option>
            <option value="inactive">⛔ Faol emas</option>
          </select>

          {/* Shablon qo'shish */}
          {canManage && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{ 
                padding: '10px 20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ➕ Shablon qo'shish
            </button>
          )}
        </div>
      </div>

      {/* Shablonlar ro'yxati */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '15px' 
      }}>
        {filteredTemplates.length === 0 ? (
          <div style={{ 
            gridColumn: '1/-1', 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#999',
            background: 'white',
            borderRadius: '12px'
          }}>
            {searchTerm || filterStatus !== 'all' ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                <p>Qidiruv bo'yicha hech qanday shablon topilmadi</p>
                <button 
                  onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                  style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Filtrni tozalash
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                <p>Hech qanday shablon mavjud emas</p>
                {canManage && (
                  <button 
                    onClick={() => { resetForm(); setShowModal(true); }}
                    style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    ➕ Birinchi shablonni yarating
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div key={template.id} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              borderLeft: template.isActive ? '4px solid #28a745' : '4px solid #dc3545',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>
                    {template.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    {template.createdByName ? `👤 ${template.createdByName}` : ''}
                    {template.createdAt && ` · ${new Date(template.createdAt.seconds * 1000).toLocaleDateString()}`}
                  </div>
                </div>
                <div>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    background: template.isActive ? '#d4edda' : '#f8d7da',
                    color: template.isActive ? '#155724' : '#721c24'
                  }}>
                    {template.isActive ? '✅ Faol' : '⛔ Faol emas'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                <strong>💊 Preparatlar:</strong> 
                <span style={{ marginLeft: '4px' }}>
                  {template.productNames?.length > 0 ? template.productNames.join(', ') : '-'}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                <strong>📋 Mutaxassisliklar:</strong> 
                <span style={{ marginLeft: '4px' }}>
                  {template.specialities?.length > 0 ? template.specialities.join(', ') : '-'}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
                🆔 {template.id.slice(0, 8)}...
              </div>

              {canManage && (
                <div style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  marginTop: '12px',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '10px',
                  flexWrap: 'wrap'
                }}>
                  <button 
                    onClick={() => handleEdit(template)} 
                    style={{ padding: '4px 12px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ✏️ Tahrirlash
                  </button>
                  <button 
                    onClick={() => handleDuplicate(template)} 
                    style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    📋 Nusxalash
                  </button>
                  {!template.isActive && (
                    <button 
                      onClick={() => handleActivate(template.id)} 
                      style={{ padding: '4px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✅ Faollashtirish
                    </button>
                  )}
                  {template.isActive && (
                    <button 
                      onClick={() => handleDeactivate(template.id)} 
                      style={{ padding: '4px 12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ⛔ Faolsizlantirish
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(template.id)} 
                    style={{ padding: '4px 12px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    🗑️ O'chirish
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ============================================================
          MODAL
          ============================================================ */}
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '550px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {editingId ? '✏️ Shablonni tahrirlash' : '📋 Yangi shablon yaratish'}
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                📝 Shablon nomi <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Masalan: Kardiologlar uchun shablon"
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '2px solid #ddd', 
                  borderRadius: '10px', 
                  fontSize: '14px',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                💊 Preparatlar <span style={{ color: '#e74c3c' }}>*</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                  ({formData.productIds.length} ta tanlangan)
                </span>
              </label>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                border: '2px solid #ddd', 
                borderRadius: '10px', 
                padding: '10px',
                background: '#fafafa'
              }}>
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    ⏳ Preparatlar yuklanmoqda...
                  </div>
                ) : (
                  products.map(p => {
                    const isChecked = formData.productIds.includes(p.id);
                    return (
                      <label key={p.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isChecked ? '#e8ecf1' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, productIds: [...formData.productIds, p.id]});
                            } else {
                              setFormData({...formData, productIds: formData.productIds.filter(id => id !== p.id)});
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                📋 Mutaxassisliklar <span style={{ color: '#e74c3c' }}>*</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                  ({formData.specialities.length} ta tanlangan)
                </span>
              </label>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                border: '2px solid #ddd', 
                borderRadius: '10px', 
                padding: '10px',
                background: '#fafafa'
              }}>
                {allSpecialities.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    ⏳ Mutaxassisliklar yuklanmoqda...
                  </div>
                ) : (
                  allSpecialities.map(s => {
                    const isChecked = formData.specialities.includes(s);
                    return (
                      <label key={s} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isChecked ? '#e8ecf1' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, specialities: [...formData.specialities, s]});
                            } else {
                              setFormData({...formData, specialities: formData.specialities.filter(sp => sp !== s)});
                            }
                          }}
                        />
                        <span>{s}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ 
              fontSize: '12px', 
              color: '#888', 
              marginBottom: '15px',
              padding: '8px 12px',
              background: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <strong>📊 Xulosa:</strong> 
              <span style={{ marginLeft: '8px' }}>
                {formData.productIds.length} ta preparat, {formData.specialities.length} ta mutaxassislik
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                style={{ 
                  padding: '12px', 
                  flex: 1, 
                  background: '#e8ecf1', 
                  border: 'none', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d5d9e0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e8ecf1'}
              >
                ❌ Bekor qilish
              </button>
              <button 
                onClick={handleSave} 
                style={{ 
                  padding: '12px', 
                  flex: 2, 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {editingId ? '🔄 Yangilash' : '💾 Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;