import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
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
  where
} from 'firebase/firestore';

// ============ INTERFACES ============

interface WorkerGroup {
  id: string;
  name: string;
  description: string;
  type: 'visit' | 'custom'; // visit - vizit guruhi, custom - oddiy guruh
  doctorIds: string[];
  userId: string;
  userRegion: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  speciality: string;
  region: string;
  district: string;
  isActive: boolean;
}

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  region: string;
  isActive: boolean;
}

// ============ ASOSIY KOMPONENT ============

const WorkerGroups: React.FC = () => {
  const currentUser = auth.currentUser;
  const [userRole, setUserRole] = useState<string>('mp');
  const [userRegion, setUserRegion] = useState<string>('Toshkent');
  
  // Worker Groups
  const [workerGroups, setWorkerGroups] = useState<WorkerGroup[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  
  // Common
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom' as 'visit' | 'custom',
    doctorIds: [] as string[]
  });

  // ============ LOAD DATA ============

  // Hozirgi foydalanuvchi ma'lumotlarini olish
  useEffect(() => {
    // Hozircha demo ma'lumotlar
    setUserRole('mp');
    setUserRegion('Toshkent');
  }, []);

  // Load worker groups
  useEffect(() => {
    const q = query(collection(db, 'workerGroups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkerGroup));
      
      // Foydalanuvchi faqat o'z hududidagi guruhlarni ko'radi (agar mp bo'lsa)
      let filteredData = data;
      if (userRole === 'mp') {
        filteredData = data.filter(g => g.userRegion === userRegion);
      }
      
      setWorkerGroups(filteredData);
      setLoading(false);
    }, (error) => {
      setError('Xatolik: ' + error.message);
      setLoading(false);
    });
    return unsubscribe;
  }, [userRole, userRegion]);

  // Load doctors (faqat foydalanuvchi hududidagi vrachlar)
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        let q = query(collection(db, 'doctors'));
        
        // MP faqat o'z hududidagi vrachlarni ko'radi
        if (userRole === 'mp' && userRegion) {
          q = query(q, where('region', '==', userRegion));
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Doctor));
        
        setDoctors(data);
        setFilteredDoctors(data);
      } catch (err: any) {
        console.error('Xatolik:', err);
      }
    };
    loadDoctors();
  }, [userRole, userRegion]);

  // ============ CHECKBOX HANDLERS ============

  const toggleDoctor = (doctorId: string) => {
    setSelectedDoctorIds(prev =>
      prev.includes(doctorId)
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const toggleAllDoctors = () => {
    const activeIds = filteredDoctors.filter(d => d.isActive !== false).map(d => d.id);
    setSelectedDoctorIds(prev => prev.length === activeIds.length ? [] : activeIds);
  };

  // ============ CRUD ============

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Guruh nomini kiriting!');
      return;
    }

    // Vizit guruhini tekshirish (faqat bitta bo'lishi kerak)
    if (formData.type === 'visit') {
      const existingVisitGroup = workerGroups.find(g => g.type === 'visit');
      if (existingVisitGroup) {
        setError('Vizit guruhi allaqachon mavjud!');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'workerGroups'), {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        doctorIds: selectedDoctorIds,
        userId: auth.currentUser?.uid || 'anonymous',
        userRegion: userRegion || '',
        isActive: true,
        createdAt: serverTimestamp()
      });
      setSuccess('✅ Guruh qo\'shildi!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'workerGroups', editingId), {
        name: formData.name,
        description: formData.description || '',
        doctorIds: selectedDoctorIds,
        isActive: true,
        updatedAt: serverTimestamp()
      });
      setSuccess('✅ Guruh yangilandi!');
      setEditingId(null);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    // Vizit guruhini o'chirishga ruxsat yo'q
    const group = workerGroups.find(g => g.id === id);
    if (group?.type === 'visit') {
      setError('❌ Vizit guruhini o\'chirish mumkin emas!');
      return;
    }
    
    if (!confirm('Bu guruhni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'workerGroups', id));
      setSuccess('✅ Guruh o\'chirildi!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ HELPERS ============

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'custom',
      doctorIds: []
    });
    setSelectedDoctorIds([]);
    setEditingId(null);
  };

  const handleEdit = (group: WorkerGroup) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      type: group.type,
      doctorIds: group.doctorIds || []
    });
    setSelectedDoctorIds(group.doctorIds || []);
    setShowModal(true);
  };

  const getDoctorName = (id: string) => {
    const doctor = doctors.find(d => d.id === id);
    return doctor ? doctor.name : 'Noma\'lum';
  };

  const getDoctorSpeciality = (id: string) => {
    const doctor = doctors.find(d => d.id === id);
    return doctor ? doctor.speciality : '-';
  };

  // Qidiruv bo'yicha filtrlash
  useEffect(() => {
    if (searchTerm) {
      setFilteredDoctors(
        doctors.filter(d => 
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.speciality.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.district.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredDoctors(doctors);
    }
  }, [searchTerm, doctors]);

  // ============ RENDER ============

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  // Vizit guruhini topish
  const visitGroup = workerGroups.find(g => g.type === 'visit');
  const customGroups = workerGroups.filter(g => g.type === 'custom');

  return (
    <div style={{ padding: '20px' }}>
      {/* Error/Success */}
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>👥 Ишчилар гуруҳлари</h2>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            📍 {userRegion} | 👤 {userRole.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ➕ Янги гуруҳ
          </button>
        </div>
      </div>

      {/* 👑 VIZIT GURUHI (MAXSUS) */}
      {visitGroup && (
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '2px solid #667eea',
          position: 'relative'
        }}>
          <div style={{ 
            position: 'absolute',
            top: '-10px',
            left: '16px',
            background: 'white',
            padding: '0 8px',
            fontSize: '12px',
            color: '#667eea',
            fontWeight: 'bold'
          }}>
            👑 VIZIT GURUHI
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>{visitGroup.name}</h3>
              <div style={{ fontSize: '13px', color: '#666' }}>{visitGroup.description || 'Vizit guruhi'}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                👨‍⚕️ Врачлар: {visitGroup.doctorIds?.length || 0} ta
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {visitGroup.doctorIds?.slice(0, 5).map(id => (
                    <span key={id} style={{ background: '#e8ecf1', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                      {getDoctorName(id)}
                    </span>
                  ))}
                  {visitGroup.doctorIds?.length > 5 && (
                    <span style={{ color: '#888', fontSize: '11px' }}>+{visitGroup.doctorIds.length - 5}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <span style={{ color: '#667eea' }}>🔒 Faqat tahrirlash mumkin, o'chirish mumkin emas</span>
              </div>
            </div>
            <div>
              <button 
                onClick={() => handleEdit(visitGroup)} 
                style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✏️ Tahrirlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 BOSHQA GURUHLAR */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#555' }}>
          📋 Бошқа гуруҳлар ({customGroups.length})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {customGroups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999', gridColumn: '1/-1' }}>
              📭 Ҳеч қандай гуруҳ мавжуд эмас
            </div>
          )}
          {customGroups.map(group => (
            <div key={group.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{group.name}</h3>
                  <div style={{ fontSize: '13px', color: '#666' }}>{group.description || 'Tavsif yo\'q'}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    👨‍⚕️ Врачлар: {group.doctorIds?.length || 0} ta
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {group.doctorIds?.slice(0, 3).map(id => (
                        <span key={id} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {getDoctorName(id)}
                        </span>
                      ))}
                      {group.doctorIds?.length > 3 && (
                        <span style={{ color: '#888', fontSize: '11px' }}>+{group.doctorIds.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleEdit(group)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteGroup(group.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== MODAL FORM ====== */}
      {showModal && (
        <div
          style={{
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
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {editingId ? '✏️ Гуруҳни таҳрирлаш' : '➕ Янги гуруҳ'}
            </h3>

            <form onSubmit={editingId ? handleUpdateGroup : handleAddGroup}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Гуруҳ номи *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тавсиф</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              {!editingId && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Гуруҳ тури</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'visit' | 'custom'})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  >
                    <option value="custom">📋 Оддий гуруҳ</option>
                    <option value="visit">👑 Vizit гуруҳи</option>
                  </select>
                  {formData.type === 'visit' && (
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      ⚠️ Vizit guruhi faqat bitta bo'lishi mumkin va uni o'chirib bo'lmaydi
                    </div>
                  )}
                </div>
              )}

              {/* Doctor checkbox list */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500' }}>👨‍⚕️ Врачлар ({filteredDoctors.length})</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="🔍 Qidirish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', width: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={toggleAllDoctors}
                      style={{ fontSize: '11px', padding: '2px 8px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {selectedDoctorIds.length === filteredDoctors.filter(d => d.isActive !== false).length ? '✅ Olib tashlash' : '☑️ Barchasini tanlash'}
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                  {filteredDoctors.filter(d => d.isActive !== false).length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '10px' }}>
                      📭 {userRole === 'mp' ? 'Sizning hududingizda' : ''} Врачлар mavjud emas
                    </div>
                  ) : (
                    filteredDoctors.filter(d => d.isActive !== false).map(doctor => (
                      <label key={doctor.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedDoctorIds.includes(doctor.id)}
                          onChange={() => toggleDoctor(doctor.id)}
                        />
                        <span>{doctor.name}</span>
                        <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                          {doctor.speciality} ({doctor.district})
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  Tanlangan: {selectedDoctorIds.length} ta
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Бекор қилиш
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {editingId ? 'Янгилаш' : 'Сақлаш'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerGroups;

