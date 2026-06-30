import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase/config';

interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  diagnosis: string;
  userId: string;
  createdAt: any;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', diagnosis: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Patient));
      setPatients(data);
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) {
      setError('Iltimos, ismni kiriting!');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'patients', editingId), {
          ...form,
          updatedAt: new Date()
        });
        setSuccess('✅ Bemor yangilandi!');
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'patients'), {
          ...form,
          userId: auth.currentUser?.uid || 'anonymous',
          createdAt: new Date()
        });
        setSuccess('✅ Bemor qo\'shildi!');
      }
      setForm({ name: '', phone: '', address: '', diagnosis: '' });
      await loadPatients();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu bemorni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      setSuccess('✅ Bemor o\'chirildi!');
      await loadPatients();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setForm({
      name: patient.name,
      phone: patient.phone || '',
      address: patient.address || '',
      diagnosis: patient.diagnosis || ''
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👨‍⚕️ Bemorlar ({patients.length})</h2>
        <button 
          onClick={() => { setEditingId(null); setForm({ name: '', phone: '', address: '', diagnosis: '' }); }}
          style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          + Yangi bemor
        </button>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>✅ {success}</div>}

      {/* Forma */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ism *</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              required 
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Telefon</label>
            <input 
              type="text" 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Manzil</label>
            <input 
              type="text" 
              value={form.address} 
              onChange={(e) => setForm({ ...form, address: e.target.value })} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Tashxis</label>
            <input 
              type="text" 
              value={form.diagnosis} 
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {editingId ? 'Yangilash' : 'Qo\'shish'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={() => { setEditingId(null); setForm({ name: '', phone: '', address: '', diagnosis: '' }); }}
                style={{ marginLeft: '10px', padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Bekor qilish
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Jadval */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ism</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Telefon</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Manzil</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Tashxis</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Harakat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center' }}>⏳ Yuklanmoqda...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>📭 Hech qanday bemor yo'q</td></tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px' }}>{index + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{patient.name}</td>
                    <td style={{ padding: '10px' }}>{patient.phone || '-'}</td>
                    <td style={{ padding: '10px' }}>{patient.address || '-'}</td>
                    <td style={{ padding: '10px' }}>{patient.diagnosis || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEdit(patient)} 
                        style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                      >✏️</button>
                      <button 
                        onClick={() => handleDelete(patient.id)} 
                        style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Patients;
