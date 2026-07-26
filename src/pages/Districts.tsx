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

interface Region {
  id: string;
  name: string;
  isActive: boolean;
}

interface District {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

const Districts: React.FC = () => {
  const { user } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    regionId: '',
    order: 0,
    isActive: true
  });

  const canManage = user?.role === 'superadmin' || user?.role === 'seo';

  useEffect(() => {
    if (!canManage) return;

    // Tumanlarni yuklash
    const districtsUnsubscribe = onSnapshot(
      query(collection(db, 'districts'), orderBy('order', 'asc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as District));
        setDistricts(data);
        setLoading(false);
      },
      (error) => {
        setError('Xatolik: ' + error.message);
        setLoading(false);
      }
    );

    // Viloyatlarni yuklash
    const regionsUnsubscribe = onSnapshot(
      query(collection(db, 'regions'), where('isActive', '==', true)),
      (snapshot) => {
        setRegions(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Region)));
      }
    );

    return () => {
      districtsUnsubscribe();
      regionsUnsubscribe();
    };
  }, [canManage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Tuman nomini kiriting!');
      return;
    }

    if (!formData.regionId) {
      setError('Viloyatni tanlang!');
      return;
    }

    const region = regions.find(r => r.id === formData.regionId);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'districts', editingId), {
          name: formData.name,
          regionId: formData.regionId,
          regionName: region?.name || '',
          order: formData.order || 0,
          isActive: formData.isActive,
          updatedAt: serverTimestamp()
        });
        setSuccess('✅ Tuman yangilandi!');
      } else {
        await addDoc(collection(db, 'districts'), {
          name: formData.name,
          regionId: formData.regionId,
          regionName: region?.name || '',
          order: formData.order || 0,
          isActive: formData.isActive,
          createdAt: serverTimestamp()
        });
        setSuccess('✅ Tuman qo\'shildi!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ушбу tumani o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'districts', id));
      setSuccess('✅ Tuman o\'chirildi!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEdit = (district: District) => {
    setEditingId(district.id);
    setFormData({
      name: district.name,
      regionId: district.regionId,
      order: district.order || 0,
      isActive: district.isActive !== undefined ? district.isActive : true
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', regionId: '', order: 0, isActive: true });
    setEditingId(null);
  };

  if (!canManage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⛔ Ҳуқуқингиз йўқ</h2>
        <p>Tumanlarни бошқариш учун ҳуқуқингиз етарли эмас</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📍 Tumanlar boshqaruvi</h2>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >➕ Tuman qo'shish</button>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>№</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Номи</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Viloyat</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Тартиб</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳолат</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳаракатлар</th>
            </tr>
          </thead>
          <tbody>
            {districts.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай tuman топилмади</td></tr>
            ) : (
              districts.map((d, index) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{d.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '4px', background: '#e8ecf1', fontSize: '12px' }}>
                      {d.regionName || d.regionId || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{d.order || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '4px',
                      background: d.isActive !== false ? '#d4edda' : '#f8d7da',
                      color: d.isActive !== false ? '#155724' : '#721c24'
                    }}>
                      {d.isActive !== false ? '✅ Фаол' : '❌ Фаол эмас'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleEdit(d)} style={{ padding: '4px 12px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                    <button onClick={() => handleDelete(d.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
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
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Tumani tahrirlash' : '➕ Yangi tuman qo\'shish'}</h3>
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
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Viloyat *</label>
                <select
                  value={formData.regionId}
                  onChange={(e) => setFormData({...formData, regionId: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Viloyat tanlang</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тартиб</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: Number(e.target.value)})}
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

export default Districts;
