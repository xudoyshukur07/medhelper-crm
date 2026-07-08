import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
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

interface Template {
  id: string;
  name: string;
  productIds: string[];
  productNames: string[];
  specialities: string[];
  isActive: boolean;
  createdBy: string;
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

const Templates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    productIds: [] as string[],
    specialities: [] as string[]
  });
  const [allSpecialities, setAllSpecialities] = useState<string[]>([]);

  const canManage = user?.role === 'superadmin' || user?.role === 'admin';

  // ============ LOAD DATA ============
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'templates'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));
      setTemplates(data);
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
    const q = query(collection(db, 'doctors'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Doctor));
      setDoctors(data);
      const specialities = [...new Set(data.map(d => d.speciality).filter(Boolean))];
      setAllSpecialities(specialities);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ============ CRUD ============
  const handleSave = async () => {
    if (!formData.name || formData.productIds.length === 0 || formData.specialities.length === 0) {
      alert('Shablon nomi, preparatlar va mutaxassisliklar majburiy!');
      return;
    }

    const productNames = formData.productIds.map(id => products.find(p => p.id === id)?.name || '');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'templates', editingId), {
          ...formData,
          productNames,
          updatedAt: serverTimestamp()
        });
        alert('✅ Shablon yangilandi!');
      } else {
        await addDoc(collection(db, 'templates'), {
          ...formData,
          productNames,
          isActive: true,
          createdBy: user?.id || '',
          createdAt: serverTimestamp()
        });
        alert('✅ Shablon yaratildi!');
      }
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'templates', id), { isActive: true });
      alert('✅ Shablon faollashtirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'templates', id), { isActive: false });
      alert('✅ Shablon faolsizlantirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu shablonni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
      alert('✅ Shablon o\'chirildi!');
    } catch (error: any) {
      alert('❌ Xatolik: ' + error.message);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      productIds: template.productIds || [],
      specialities: template.specialities || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', productIds: [], specialities: [] });
    setEditingId(null);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>📋 Shablonlar ({templates.length})</h2>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ➕ Shablon
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
        {templates.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>
            📭 Hech qanday shablon mavjud emas
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              borderLeft: template.isActive ? '4px solid #28a745' : '4px solid #dc3545'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>
                  {template.name}
                  {template.isActive ? ' ✅' : ' ⛔'}
                </h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {canManage && (
                    <>
                      <button onClick={() => handleEdit(template)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                      {!template.isActive && (
                        <button onClick={() => handleActivate(template.id)} style={{ padding: '4px 8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✅</button>
                      )}
                      {template.isActive && (
                        <button onClick={() => handleDeactivate(template.id)} style={{ padding: '4px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>⛔</button>
                      )}
                      <button onClick={() => handleDelete(template.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                <strong>💊 Preparatlar:</strong> {template.productNames?.join(', ') || '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                <strong>📋 Mutaxassisliklar:</strong> {template.specialities?.join(', ') || '-'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? '✏️ Shablonni tahrirlash' : '📋 Yangi shablon'}</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📝 Shablon nomi</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #ddd', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>💊 Preparatlar</label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '2px solid #ddd', borderRadius: '10px', padding: '10px' }}>
                {products.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.productIds.includes(p.id)}
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
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📋 Mutaxassisliklar</label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '2px solid #ddd', borderRadius: '10px', padding: '10px' }}>
                {allSpecialities.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.specialities.includes(s)}
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
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: '12px', flex: 1, background: '#e8ecf1', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>Bekor</button>
              <button onClick={handleSave} style={{ padding: '12px', flex: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>{editingId ? 'Yangilash' : 'Saqlash'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
