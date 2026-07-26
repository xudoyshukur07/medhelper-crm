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

interface ProductGroup {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  isActive: boolean;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  productGroupIds: string[];
  isActive: boolean;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

interface WorkerGroup {
  id: string;
  name: string;
  description: string;
  type: 'visit' | 'custom';
  doctorIds: string[];
  userId: string;
  userRegion: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  region: string;
  isActive: boolean;
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

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

// ============ 3-BO'LIM: ISHCHILAR GURUHLARI ============
const WorkerGroupsSection: React.FC = () => {
  const [workerGroups, setWorkerGroups] = useState<WorkerGroup[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [userRegion, setUserRegion] = useState<string>('Toshkent');
  const [userRole, setUserRole] = useState<string>('mp');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom' as 'visit' | 'custom',
    doctorIds: [] as string[]
  });

  // Hozirgi foydalanuvchi ma'lumotlari
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserRole('mp');
      setUserRegion('Toshkent');
    }
  }, []);

  // Load worker groups (real-time)
  useEffect(() => {
    const q = query(collection(db, 'workerGroups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkerGroup));
      
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
        let q = query(collection(db, 'doctors'), where('isActive', '==', true));
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

  const visitGroup = workerGroups.find(g => g.type === 'visit');
  const customGroups = workerGroups.filter(g => g.type === 'custom');

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  return (
    <div>
      {/* Error/Success */}
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>👥 Ишчилар гуруҳлари</h2>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
            📍 {userRegion} | 👤 {userRole.toUpperCase()}
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          ➕ Янги гуруҳ
        </button>
      </div>

      {/* 👑 VIZIT GURUHI */}
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
            background: '#f0f2f5',
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
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#667eea' }}>
                🔒 Faqat tahrirlash mumkin, o'chirish mumkin emas
              </div>
            </div>
            <button 
              onClick={() => handleEdit(visitGroup)} 
              style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✏️ Tahrirlash
            </button>
          </div>
        </div>
      )}

      {/* 📋 BOSHQA GURUHLAR */}
      <div>
        <h3 style={{ margin: '0 0 16px', color: '#555' }}>
          📋 Бошқа гуруҳлар ({customGroups.length})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {customGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999', gridColumn: '1/-1' }}>
              📭 Ҳеч қандай гуруҳ мавжуд эмас
            </div>
          ) : (
            customGroups.map(group => (
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
            ))
          )}
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

// ============ ASOSIY GROUPS KOMPONENTI ============

const Groups: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'product' | 'user' | 'worker' | 'special'>('product');
  
  // Product Groups
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // User Groups
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  
  // Common
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkbox states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedProductGroupIds, setSelectedProductGroupIds] = useState<string[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    productIds: [] as string[],
    userIds: [] as string[],
    productGroupIds: [] as string[]
  });

  // ============ LOAD DATA ============

  // Load product groups
  useEffect(() => {
    const q = query(collection(db, 'productGroups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProductGroup));
      setProductGroups(data);
      setLoading(false);
    }, (error) => {
      setError('Xatolik: ' + error.message);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load user groups
  useEffect(() => {
    const q = query(collection(db, 'userGroups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserGroup));
      setUserGroups(data);
    }, (error) => {
      setError('Xatolik: ' + error.message);
    });
    return unsubscribe;
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(data);
      } catch (err: any) {
        console.error('Xatolik:', err);
      }
    };
    loadProducts();
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const demoUsers: AppUser[] = [
          { id: '1', email: 'admin@medhelper.uz', displayName: 'Admin', role: 'superadmin', region: 'Toshkent', isActive: true },
          { id: '2', email: 'ali@medhelper.uz', displayName: 'Ali Valiyev', role: 'ffm', region: 'Samarqand', isActive: true },
          { id: '3', email: 'dilora@medhelper.uz', displayName: 'Dilora Karimova', role: 'mp', region: 'Toshkent', isActive: true },
          { id: '4', email: 'gani@medhelper.uz', displayName: 'Gani Ibragimov', role: 'rm', region: 'Samarqand', isActive: true },
          { id: '5', email: 'sevara@medhelper.uz', displayName: 'Sevara Nurmatova', role: 'pm', region: 'Buxoro', isActive: true },
        ];
        setAppUsers(demoUsers);
      } catch (err: any) {
        console.error('Xatolik:', err);
      }
    };
    loadUsers();
  }, []);

  // ============ CHECKBOX HANDLERS ============

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleProductGroup = (groupId: string) => {
    setSelectedProductGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleAllProducts = () => {
    const activeIds = products.filter(p => p.isActive !== false).map(p => p.id);
    setSelectedProductIds(prev => prev.length === activeIds.length ? [] : activeIds);
  };

  const toggleAllUsers = () => {
    const activeIds = appUsers.filter(u => u.isActive !== false).map(u => u.id);
    setSelectedUserIds(prev => prev.length === activeIds.length ? [] : activeIds);
  };

  const toggleAllProductGroups = () => {
    const activeIds = productGroups.filter(g => g.isActive !== false).map(g => g.id);
    setSelectedProductGroupIds(prev => prev.length === activeIds.length ? [] : activeIds);
  };

  // ============ CRUD - PRODUCT GROUPS ============

  const handleAddProductGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Guruh nomini kiriting!');
      return;
    }

    try {
      await addDoc(collection(db, 'productGroups'), {
        name: formData.name,
        description: formData.description || '',
        productIds: selectedProductIds,
        isActive: formData.isActive,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setSuccess('✅ Preparat guruhi qo\'shildi!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateProductGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'productGroups', editingId), {
        name: formData.name,
        description: formData.description || '',
        productIds: selectedProductIds,
        isActive: formData.isActive,
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

  const handleDeleteProductGroup = async (id: string) => {
    if (!confirm('Bu guruhni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'productGroups', id));
      setSuccess('✅ Guruh o\'chirildi!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ CRUD - USER GROUPS ============

  const handleAddUserGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Guruh nomini kiriting!');
      return;
    }

    try {
      await addDoc(collection(db, 'userGroups'), {
        name: formData.name,
        description: formData.description || '',
        userIds: selectedUserIds,
        productGroupIds: selectedProductGroupIds,
        isActive: formData.isActive,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setSuccess('✅ Foydalanuvchi guruhi qo\'shildi!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateUserGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'userGroups', editingId), {
        name: formData.name,
        description: formData.description || '',
        userIds: selectedUserIds,
        productGroupIds: selectedProductGroupIds,
        isActive: formData.isActive,
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

  const handleDeleteUserGroup = async (id: string) => {
    if (!confirm('Bu guruhni o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'userGroups', id));
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
      isActive: true,
      productIds: [],
      userIds: [],
      productGroupIds: []
    });
    setSelectedProductIds([]);
    setSelectedUserIds([]);
    setSelectedProductGroupIds([]);
    setEditingId(null);
  };

  const handleEdit = (item: any, type: 'product' | 'user') => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      isActive: item.isActive !== undefined ? item.isActive : true,
      productIds: item.productIds || [],
      userIds: item.userIds || [],
      productGroupIds: item.productGroupIds || []
    });
    
    if (type === 'product') {
      setSelectedProductIds(item.productIds || []);
    } else {
      setSelectedUserIds(item.userIds || []);
      setSelectedProductGroupIds(item.productGroupIds || []);
    }
    
    setShowModal(true);
  };

  const getProductGroupName = (id: string) => {
    const group = productGroups.find(g => g.id === id);
    return group ? group.name : 'Noma\'lum';
  };

  const getUserName = (id: string) => {
    const user = appUsers.find(u => u.id === id);
    return user ? user.displayName || user.email : 'Noma\'lum';
  };

  const getUserRole = (id: string) => {
    const user = appUsers.find(u => u.id === id);
    return user ? user.role : '-';
  };

  const getProductName = (id: string) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : 'Noma\'lum';
  };

  // ============ RENDER ============

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Error/Success */}
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('product'); resetForm(); setShowModal(false); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'product' ? '#667eea' : '#e8ecf1',
            color: activeTab === 'product' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'product' ? 'bold' : 'normal'
          }}
        >
          💊 1. Препарат гуруҳлари ({productGroups.length})
        </button>
        <button
          onClick={() => { setActiveTab('user'); resetForm(); setShowModal(false); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'user' ? '#667eea' : '#e8ecf1',
            color: activeTab === 'user' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'user' ? 'bold' : 'normal'
          }}
        >
          👥 2. Фойдаланувчи гуруҳлари ({userGroups.length})
        </button>
        <button
          onClick={() => { setActiveTab('worker'); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'worker' ? '#667eea' : '#e8ecf1',
            color: activeTab === 'worker' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'worker' ? 'bold' : 'normal'
          }}
        >
          👥 3. Ишчилар гуруҳи
        </button>
        <button
          onClick={() => { setActiveTab('special'); }}
          style={{
            padding: '10px 20px',
            background: activeTab === 'special' ? '#667eea' : '#e8ecf1',
            color: activeTab === 'special' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'special' ? 'bold' : 'normal'
          }}
        >
          ⭐ 4. Максус гуруҳлар (Tez orada)
        </button>
      </div>

      {/* ====== 1. PRODUCT GROUPS ====== */}
      {activeTab === 'product' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>💊 Препарат гуруҳлари</h2>
              <span style={{ fontSize: '14px', color: '#888' }}>({productGroups.length} ta)</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '200px' }}
              />
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                ➕ Yangi guruh
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {productGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map(group => (
              <div key={group.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>{group.name}</h3>
                    <div style={{ fontSize: '13px', color: '#666' }}>{group.description || 'Tavsif yo\'q'}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                      {group.productIds && group.productIds.length > 0 ? (
                        <div>
                          📦 Preparatlar: {group.productIds.length} ta
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            {group.productIds.slice(0, 3).map(id => (
                              <span key={id} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                                {getProductName(id)}
                              </span>
                            ))}
                            {group.productIds.length > 3 && <span>+{group.productIds.length - 3}</span>}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>📭 Preparatlar yo'q</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {group.isActive ? '✅ Faol' : '❌ Faol emas'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleEdit(group, 'product')} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleDeleteProductGroup(group.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== 2. USER GROUPS ====== */}
      {activeTab === 'user' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>👥 Фойдаланувчи гуруҳлари</h2>
              <span style={{ fontSize: '14px', color: '#888' }}>({userGroups.length} ta)</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '200px' }}
              />
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                ➕ Янги гуруҳ
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {userGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map(group => (
              <div key={group.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>{group.name}</h3>
                    <div style={{ fontSize: '13px', color: '#666' }}>{group.description || 'Tavsif yo\'q'}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                      {group.userIds && group.userIds.length > 0 ? (
                        <div>
                          👤 Фойдаланувчилар: {group.userIds.length} ta
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            {group.userIds.slice(0, 3).map(id => (
                              <span key={id} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                                {getUserName(id)} ({getUserRole(id)})
                              </span>
                            ))}
                            {group.userIds.length > 3 && <span>+{group.userIds.length - 3}</span>}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>👤 Фойдаланувчилар yo'q</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {group.productGroupIds && group.productGroupIds.length > 0 ? (
                        <div>
                          📂 Препарат гуруҳлари: {group.productGroupIds.length} ta
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            {group.productGroupIds.slice(0, 3).map(id => (
                              <span key={id} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                                {getProductGroupName(id)}
                              </span>
                            ))}
                            {group.productGroupIds.length > 3 && <span>+{group.productGroupIds.length - 3}</span>}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>📂 Preparat guruhlari yo'q</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {group.isActive ? '✅ Faol' : '❌ Faol emas'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleEdit(group, 'user')} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleDeleteUserGroup(group.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== 3. WORKER GROUPS ====== */}
      {activeTab === 'worker' && <WorkerGroupsSection />}

      {/* ====== 4. SPECIAL GROUPS ====== */}
      {activeTab === 'special' && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
          <h3 style={{ color: '#667eea' }}>Максус гуруҳлар</h3>
          <p style={{ color: '#888', fontSize: '16px' }}>Бу бўлим тез орада ишга туширилади</p>
          <p style={{ color: '#aaa', fontSize: '14px' }}>Кутинг...</p>
        </div>
      )}

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
              {activeTab === 'product' 
                ? (editingId ? '✏️ Препарат гуруҳни таҳрирлаш' : '➕ Янги препарат гуруҳи')
                : (editingId ? '✏️ Фойдаланувчи гуруҳни таҳрирлаш' : '➕ Янги фойдаланувчи гуруҳи')
              }
            </h3>

            <form onSubmit={activeTab === 'product' 
              ? (editingId ? handleUpdateProductGroup : handleAddProductGroup)
              : (editingId ? handleUpdateUserGroup : handleAddUserGroup)
            }>
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

              {/* Product Groups - Product checkbox list */}
              {activeTab === 'product' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '500' }}>📦 Препаратлар</label>
                    <button
                      type="button"
                      onClick={toggleAllProducts}
                      style={{ fontSize: '12px', padding: '2px 10px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {selectedProductIds.length === products.filter(p => p.isActive !== false).length ? '✅ Barchasini olib tashlash' : '☑️ Barchasini tanlash'}
                    </button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                    {products.filter(p => p.isActive !== false).map(product => (
                      <label key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                        />
                        <span>{product.name}</span>
                        <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                          {product.price.toLocaleString()} so'm
                        </span>
                      </label>
                    ))}
                    {products.filter(p => p.isActive !== false).length === 0 && (
                      <div style={{ color: '#999', textAlign: 'center', padding: '10px' }}>📭 Preparatlar mavjud emas</div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Tanlangan: {selectedProductIds.length} ta
                  </div>
                </div>
              )}

              {/* User Groups - User and Product Group checkbox lists */}
              {activeTab === 'user' && (
                <>
                  {/* Users */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: '500' }}>👤 Фойдаланувчилар</label>
                      <button
                        type="button"
                        onClick={toggleAllUsers}
                        style={{ fontSize: '12px', padding: '2px 10px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {selectedUserIds.length === appUsers.filter(u => u.isActive !== false).length ? '✅ Barchasini olib tashlash' : '☑️ Barchasini tanlash'}
                      </button>
                    </div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                      {appUsers.filter(u => u.isActive !== false).map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                          />
                          <span>{user.displayName || user.email}</span>
                          <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                            {user.role} ({user.region})
                          </span>
                        </label>
                      ))}
                      {appUsers.filter(u => u.isActive !== false).length === 0 && (
                        <div style={{ color: '#999', textAlign: 'center', padding: '10px' }}>👤 Фойдаланувчилар mavjud emas</div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      Tanlangan: {selectedUserIds.length} ta
                    </div>
                  </div>

                  {/* Product Groups */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: '500' }}>📂 Препарат гуруҳлари</label>
                      <button
                        type="button"
                        onClick={toggleAllProductGroups}
                        style={{ fontSize: '12px', padding: '2px 10px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {selectedProductGroupIds.length === productGroups.filter(g => g.isActive !== false).length ? '✅ Barchasini olib tashlash' : '☑️ Barchasini tanlash'}
                      </button>
                    </div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                      {productGroups.filter(g => g.isActive !== false).map(group => (
                        <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedProductGroupIds.includes(group.id)}
                            onChange={() => toggleProductGroup(group.id)}
                          />
                          <span>{group.name}</span>
                          <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                            {group.productIds?.length || 0} ta preparat
                          </span>
                        </label>
                      ))}
                      {productGroups.filter(g => g.isActive !== false).length === 0 && (
                        <div style={{ color: '#999', textAlign: 'center', padding: '10px' }}>📂 Preparat guruhlari mavjud emas</div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      Tanlangan: {selectedProductGroupIds.length} ta
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                <select
                  value={formData.isActive ? 'true' : 'false'}
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

export default Groups;

