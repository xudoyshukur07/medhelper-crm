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
  where,
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

interface ProductGroup {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

const ProductGroups: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });

  const canManage = user?.role === 'superadmin' || user?.role === 'seo' || user?.role === 'pm';

  useEffect(() => {
    if (!canManage) return;

    const q = query(collection(db, 'productGroups'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProductGroup));
      setGroups(data);
      setLoading(false);
    }, (error) => {
      setError('Xatolik: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [canManage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Guruh nomini kiriting!');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'productGroups', editingId), {
          name: formData.name,
          isActive: formData.isActive,
          updatedAt: serverTimestamp()
        });
        setSuccess('✅ Guruh yangilandi!');
      } else {
        await addDoc(collection(db, 'productGroups'), {
          name: formData.name,
          isActive: formData.isActive,
          createdAt: serverTimestamp()
        });
        setSuccess('✅ Guruh qo\'shildi!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ушбу guruhni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'productGroups', id));
      setSuccess('✅ Guruh o\'chirildi!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEdit = (group: ProductGroup) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      isActive: group.isActive !== undefined ? group.isActive : true
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', isActive: true });
    setEditingId(null);
  };

  if (!canManage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⛔ Ҳуқуқингиз йўқ</h2>
        <p>Препарат гуруҳларини бошқариш учун ҳуқуқингиз етарли эмас</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>💊 Препарат гуруҳлари</h2>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >➕ Guruh qo'shish</button>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>№</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Номи</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳолат</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳаракатлар</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай guruh топилмади</td></tr>
            ) : (
              groups.map((g, index) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{g.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '4px',
                      background: g.isActive !== false ? '#d4edda' : '#f8d7da',
                      color: g.isActive !== false ? '#155724' : '#721c24'
                    }}>
                      {g.isActive !== false ? '✅ Фаол' : '❌ Фаол эмас'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleEdit(g)} style={{ padding: '4px 12px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                    <button onClick={() => handleDelete(g.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            maxWidth: '450px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Guruhni tahrirlash' : '➕ Yangi guruh qo\'shish'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                <select
                  value={String(formData.isActive)}
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="true">✅ Фаол</option>
                  <option value="false">❌ Фаол эмас</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ flex: 1, padding: '10px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >Бекор</button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroups;
