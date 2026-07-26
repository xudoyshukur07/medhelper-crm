import React, { useState, useEffect } from 'react';
import { useAuth, UserRole, ROLE_PERMISSIONS } from '../context/AuthContext';
import { db, auth } from '../firebase';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import * as XLSX from 'xlsx';

// ===== INTERFACES =====
interface Region {
  id: string;
  name: string;
  code: string;
}

interface District {
  id: string;
  name: string;
  code: string;
  regionId: string;
  regionName?: string;
}

interface ProductGroup {
  id: string;
  name: string;
}

interface User {
  uid: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  regions?: string[];
  districts?: any[];
  districtId?: string;
  districtIds?: string[];
  productGroupIds?: string[];
  productGroupId?: string;
  managerId?: string;
  ffmId?: string;
  rmId?: string;
  subordinates?: string[];
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

// ===== YORDAMCHI FUNKSIYA: District ID larni olish =====
const extractDistrictIds = (districts: any[]): string[] => {
  if (!districts || !Array.isArray(districts)) return [];
  
  const ids: string[] = [];
  districts.forEach((item: any) => {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item && typeof item === 'object') {
      if (item.id) ids.push(item.id);
      if (item.code && !ids.includes(item.code)) ids.push(item.code);
    }
  });
  return ids;
};

// ===== YORDAMCHI FUNKSIYA: District nomlarini olish =====
const getDistrictNames = (districts: any[], allDistricts: District[]): string => {
  if (!districts || districts.length === 0) return '-';
  
  const names: string[] = [];
  districts.forEach((d: any) => {
    if (typeof d === 'string') {
      const found = allDistricts.find(dd => dd.id === d);
      names.push(found?.name || d);
    } else if (d && typeof d === 'object') {
      names.push(d.name || d.id || '');
    }
  });
  return names.filter(Boolean).join(', ') || '-';
};

const Users: React.FC = () => {
  const { user, hasPermission, autoAssignManager, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [ffmList, setFfmList] = useState<User[]>([]);
  const [rmList, setRmList] = useState<User[]>([]);

  // ===== FORM STATE =====
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'mp' as UserRole,
    regions: [] as string[],
    districts: [] as string[],
    productGroupIds: [] as string[],
    productGroupId: '',
    managerId: '',
    ffmId: '',
    isActive: true
  });

  // ===== FILTERED DISTRICTS =====
  const filteredDistricts = districts.filter(d => 
    formData.regions.includes(d.regionId)
  );

  const canManageUsers = hasPermission('canManageUsers');

  // ==========================================
  // 1. MA'LUMOTLARNI YUKLASH
  // ==========================================
  useEffect(() => {
    console.log('🔄 Users component mounted');
    
    const regionsUnsubscribe = onSnapshot(
      collection(db, 'regions'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Region));
        console.log('✅ Viloyatlar yuklandi:', data.length, 'ta');
        setRegions(data);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Viloyatlar yuklashda xatolik:', error);
        setError('Viloyatlar yuklashda xatolik: ' + error.message);
        setLoading(false);
      }
    );

    const districtsUnsubscribe = onSnapshot(
      collection(db, 'districts'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as District));
        console.log('✅ Tumanlar yuklandi:', data.length, 'ta');
        setDistricts(data);
      },
      (error) => {
        console.error('❌ Tumanlar yuklashda xatolik:', error);
      }
    );

    const groupsUnsubscribe = onSnapshot(
      collection(db, 'productGroups'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as ProductGroup));
        console.log('✅ Preparat guruhlari yuklandi:', data.length, 'ta');
        setProductGroups(data);
      },
      (error) => {
        console.error('❌ Preparat guruhlari yuklashda xatolik:', error);
      }
    );

    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));
        console.log('✅ Foydalanuvchilar yuklandi:', data.length, 'ta');
        setUsers(data);
      },
      (error) => {
        console.error('❌ Foydalanuvchilar yuklashda xatolik:', error);
      }
    );

    const ffmUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'ffm')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setFfmList(data);
      }
    );

    const rmUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'rm')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setRmList(data);
      }
    );

    return () => {
      regionsUnsubscribe();
      districtsUnsubscribe();
      groupsUnsubscribe();
      usersUnsubscribe();
      ffmUnsubscribe();
      rmUnsubscribe();
    };
  }, []);

  // ==========================================
  // 2. FORM VALIDATION
  // ==========================================
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Исм киритинг!');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email киритинг!');
      return false;
    }
    if (!editingUser && !formData.password.trim()) {
      setError('Парол киритинг!');
      return false;
    }
    if (!formData.role) {
      setError('Рол танланг!');
      return false;
    }

    if (formData.role === 'mp') {
      if (formData.regions.length === 0) {
        setError('Ҳеч бўлмаса битта вилоят танланг!');
        return false;
      }
      if (formData.districts.length === 0) {
        setError('Ҳеч бўлмаса битта тумон танланг!');
        return false;
      }
      if (formData.productGroupIds.length === 0) {
        setError('Ҳеч бўлмаса битта препарат гуруҳи танланг!');
        return false;
      }
    }

    if (formData.role === 'rm') {
      if (formData.regions.length === 0) {
        setError('Ҳеч бўлмаса битта вилоят танланг!');
        return false;
      }
      if (formData.districts.length === 0) {
        setError('Ҳеч бўлмаса битта тумон танланг!');
        return false;
      }
      if (formData.productGroupIds.length === 0) {
        setError('Ҳеч бўлмаса битта препарат гуруҳи танланг!');
        return false;
      }
    }

    if (formData.role === 'ffm') {
      if (formData.regions.length === 0) {
        setError('Ҳеч бўлмаса битта вилоят танланг!');
        return false;
      }
      if (formData.districts.length === 0) {
        setError('Ҳеч бўлмаса битта тумон танланг!');
        return false;
      }
      if (formData.productGroupIds.length === 0) {
        setError('Ҳеч бўлмаса битта препарат гуруҳи танланг!');
        return false;
      }
    }

    return true;
  };

  // ==========================================
  // 3. AUTO BOG'LASH (TUZATILGAN)
  // ==========================================
  const findAutoManagers = (role: UserRole, regions: string[], districts: any[], productGroupIds: string[]) => {
    const result: { rmId?: string; ffmId?: string } = {};

    if (role === 'mp') {
      // District ID larni olish (obyekt yoki string)
      const districtIds = extractDistrictIds(districts);

      console.log('🔍 findAutoManagers:');
      console.log('📍 District IDs:', districtIds);
      console.log('💊 ProductGroup IDs:', productGroupIds);
      console.log('👥 Barcha userlar:', users.length);

      // RM ni qidirish
      const matchingRM = users.find(u => {
        if (u.role !== 'rm') return false;
        
        // RM ning districtlari
        const rmDistrictIds = extractDistrictIds(u.districts || []);
        
        // District mosligi
        const districtMatch = districtIds.some((dId: string) => rmDistrictIds.includes(dId));
        
        // ProductGroup mosligi
        const productMatch = productGroupIds.some((pg: string) => (u.productGroupIds || []).includes(pg));
        
        if (districtMatch && productMatch) {
          console.log(`✅ RM mos keldi: ${u.name} (districtMatch=${districtMatch}, productMatch=${productMatch})`);
        }
        
        return districtMatch && productMatch;
      });

      if (matchingRM) {
        result.rmId = matchingRM.uid;
        console.log('✅ RM topildi:', matchingRM.name);
      } else {
        console.log('⚠️ Mos keladigan RM topilmadi');
      }

      // FFM ni qidirish
      const matchingFFM = users.find(u => {
        if (u.role !== 'ffm') return false;
        
        const ffmDistrictIds = extractDistrictIds(u.districts || []);
        
        const districtMatch = districtIds.some((dId: string) => ffmDistrictIds.includes(dId));
        const productMatch = productGroupIds.some((pg: string) => (u.productGroupIds || []).includes(pg));
        
        return districtMatch && productMatch;
      });

      if (matchingFFM) {
        result.ffmId = matchingFFM.uid;
        console.log('✅ FFM topildi:', matchingFFM.name);
      }
    }

    return result;
  };

  // ==========================================
  // 4. FOYDALANUVCHI QO'SHISH (TUZATILGAN)
  // ==========================================
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userData: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        createdAt: serverTimestamp()
      };

      if (formData.role === 'ffm' || formData.role === 'rm' || formData.role === 'mp') {
        userData.regions = formData.regions;
        userData.districts = formData.districts;
        userData.productGroupIds = formData.productGroupIds;
      }

      // ===== MP UCHUN =====
      if (formData.role === 'mp') {
        userData.productGroupId = formData.productGroupIds.length > 0 ? formData.productGroupIds[0] : '';
        userData.districtId = formData.districts.length > 0 ? formData.districts[0] : '';
        userData.districtIds = formData.districts; // Qo'shimcha
        
        console.log('📝 MP ma\'lumotlari:');
        console.log('📍 Districts:', formData.districts);
        console.log('💊 ProductGroups:', formData.productGroupIds);
        
        // AUTO BOG'LASH
        const autoManagers = findAutoManagers(
          'mp', 
          userData.regions, 
          userData.districts,
          userData.productGroupIds
        );
        
        userData.managerId = autoManagers.rmId || formData.managerId;
        userData.rmId = autoManagers.rmId || formData.managerId;
        userData.ffmId = autoManagers.ffmId || formData.ffmId;
        
        console.log('🎯 Bog\'langan RM:', userData.managerId);
      }

      if (formData.role === 'rm') {
        userData.managerId = formData.managerId || null;
        userData.rmId = null;
        userData.ffmId = null;
      }

      if (formData.role === 'ffm') {
        userData.managerId = null;
        userData.rmId = null;
        userData.ffmId = null;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // ===== AVTOMATIK BOG'LASH (Firebase autoAssignManager) =====
      if (formData.role === 'mp') {
        const managerId = await autoAssignManager(userData);
        if (managerId) {
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            managerId: managerId
          });
          console.log('✅ Avtomatik bog\'landi! Manager ID:', managerId);
        } else {
          console.log('⚠️ Mos keladigan manager topilmadi');
        }
      }

      // ===== MANAGER GA SUBORDINATE QO'SHISH =====
      if (userData.managerId) {
        const managerRef = doc(db, 'users', userData.managerId);
        const managerDoc = await getDoc(managerRef);
        if (managerDoc.exists()) {
          const managerData = managerDoc.data();
          const subordinates = managerData.subordinates || [];
          if (!subordinates.includes(userCredential.user.uid)) {
            subordinates.push(userCredential.user.uid);
            await updateDoc(managerRef, { 
              subordinates,
              updatedAt: serverTimestamp()
            });
            console.log('✅ Manager ga subordinate qo\'shildi:', userData.name);
            
            // ✅ USER MA'LUMOTLARINI YANGILASH
            await refreshUser();
          }
        }
      }

      setSuccess('✅ Фойдаланувчи қўшилди!');
      setShowModal(false);
      resetForm();

    } catch (err: any) {
      console.error('❌ Xatolik:', err);
      setError('Xatolik: ' + err.message);
    }
  };

  // ==========================================
  // 5. FOYDALANUVCHINI TAHRIBLASH
  // ==========================================
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const userRef = doc(db, 'users', editingUser.uid);
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        updatedAt: serverTimestamp()
      };

      if (formData.role === 'ffm' || formData.role === 'rm' || formData.role === 'mp') {
        updateData.regions = formData.regions;
        updateData.districts = formData.districts;
        updateData.productGroupIds = formData.productGroupIds;
      }

      if (formData.role === 'mp') {
        updateData.productGroupId = formData.productGroupIds.length > 0 ? formData.productGroupIds[0] : '';
        updateData.districtId = formData.districts.length > 0 ? formData.districts[0] : '';
        updateData.districtIds = formData.districts;
        
        const autoManagers = findAutoManagers(
          'mp', 
          updateData.regions, 
          updateData.districts, 
          updateData.productGroupIds
        );
        updateData.managerId = autoManagers.rmId || formData.managerId;
        updateData.rmId = autoManagers.rmId || formData.managerId;
        updateData.ffmId = autoManagers.ffmId || formData.ffmId;
      }

      await updateDoc(userRef, updateData);
      
      // ✅ USER MA'LUMOTLARINI YANGILASH
      await refreshUser();
      
      setSuccess('✅ Фойдаланувчи янгиланди!');
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ==========================================
  // 6. FOYDALANUVCHINI O'CHIRISH
  // ==========================================
  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Ушбу фойдаланувчини ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setSuccess('✅ Фойдаланувчи ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ==========================================
  // 7. RESET
  // ==========================================
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'mp',
      regions: [],
      districts: [],
      productGroupIds: [],
      productGroupId: '',
      managerId: '',
      ffmId: '',
      isActive: true
    });
  };

  // ==========================================
  // 8. EDIT
  // ==========================================
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      regions: user.regions || [],
      districts: user.districts || [],
      productGroupIds: user.productGroupIds || [],
      productGroupId: user.productGroupId || '',
      managerId: user.managerId || '',
      ffmId: user.ffmId || '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  // ==========================================
  // 9. EKSPORT (TUZATILGAN)
  // ==========================================
  const handleExport = () => {
    const exportData = users.map((u, index) => {
      const roleInfo = ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS];
      const regionNames = u.regions?.map(r => regions.find(reg => reg.id === r)?.name || r).join(', ') || '-';
      const districtNames = getDistrictNames(u.districts || [], districts);
      const groupNames = u.productGroupIds?.map(g => productGroups.find(pg => pg.id === g)?.name || g).join(', ') || '-';
      
      let managerName = '-';
      let managerEmail = '-';
      if (u.managerId) {
        const manager = users.find(m => m.uid === u.managerId);
        if (manager) {
          managerName = manager.name;
          managerEmail = manager.email;
        }
      }

      let ffmName = '-';
      let ffmEmail = '-';
      if (u.ffmId) {
        const ffm = users.find(m => m.uid === u.ffmId);
        if (ffm) {
          ffmName = ffm.name;
          ffmEmail = ffm.email;
        }
      }

      let rmName = '-';
      let rmEmail = '-';
      if (u.rmId) {
        const rm = users.find(m => m.uid === u.rmId);
        if (rm) {
          rmName = rm.name;
          rmEmail = rm.email;
        }
      }

      return {
        '№': index + 1,
        'Исм': u.name,
        'Email': u.email,
        'Парол': u.password || '---',
        'Рол': roleInfo?.label || u.role,
        'Вилоятлар': regionNames,
        'Туманар': districtNames,
        'Препарат гуруҳи': groupNames,
        'Ҳолат': u.isActive ? 'Фаол' : 'Фаол эмас',
        'Боғлиқ RM': rmName + ' (' + rmEmail + ')',
        'Боғлиқ FFM': ffmName + ' (' + ffmEmail + ')',
        'Боғлиқ Manager': managerName + ' (' + managerEmail + ')',
        'Яратилган': u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '-'
      };
    });

    if (exportData.length === 0) {
      setError('Экспорт қилиш учун фойдаланувчилар йўқ!');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Фойдаланувчилар');
      XLSX.writeFile(wb, 'фойдаланувчилар_' + new Date().toISOString().split('T')[0] + '.xlsx');
      setSuccess('✅ Экспорт қилинди!');
    } catch (err: any) {
      setError('Экспорт хатолиги: ' + err.message);
    }
  };

  // ==========================================
  // 10. MAVJUD MP LARNI RM GA BOG'LASH (QO'SHIMCHA)
  // ==========================================
  const fixExistingMPs = async () => {
    if (!confirm('Барча MP ларни RM га автоматик боғлаш?')) return;
    
    setLoading(true);
    try {
      const mpSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'mp')));
      const mps = mpSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      
      console.log(`📋 ${mps.length} ta MP topildi`);
      let fixedCount = 0;
      
      for (const mp of mps) {
        const mpDistricts = mp.districts || [];
        const mpProductGroups = mp.productGroupIds || [];
        const districtIds = extractDistrictIds(mpDistricts);
        
        // RM ni qidirish
        const rmSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'rm')));
        
        for (const rmDoc of rmSnapshot.docs) {
          const rm = rmDoc.data();
          const rmDistrictIds = extractDistrictIds(rm.districts || []);
          const rmProductGroups = rm.productGroupIds || [];
          
          const districtMatch = districtIds.some((dId: string) => rmDistrictIds.includes(dId));
          const productMatch = mpProductGroups.some((pg: string) => rmProductGroups.includes(pg));
          
          if (districtMatch && productMatch) {
            console.log(`✅ ${mp.name} → ${rm.name} ga bog'landi`);
            
            // MP ga managerId qo'shish
            await updateDoc(doc(db, 'users', mp.uid), {
              managerId: rmDoc.id,
              rmId: rmDoc.id,
              updatedAt: serverTimestamp()
            });
            
            // RM ga subordinate qo'shish
            const rmRef = doc(db, 'users', rmDoc.id);
            const rmDoc2 = await getDoc(rmRef);
            if (rmDoc2.exists()) {
              const rmData = rmDoc2.data();
              const subordinates = rmData.subordinates || [];
              if (!subordinates.includes(mp.uid)) {
                await updateDoc(rmRef, { 
                  subordinates: [...subordinates, mp.uid],
                  updatedAt: serverTimestamp()
                });
              }
            }
            fixedCount++;
            break;
          }
        }
      }
      
      // ✅ USER MA'LUMOTLARINI YANGILASH
      await refreshUser();
      
      setSuccess(`✅ ${fixedCount} ta MP RM ga bog'landi!`);
      setLoading(false);
    } catch (error) {
      console.error('Xatolik:', error);
      setError('Xatolik yuz berdi');
      setLoading(false);
    }
  };

  // ===== RENDER =====
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  if (!canManageUsers) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⛔ Ҳуқуқингиз йўқ</h2>
        <p>Фойдаланувчиларни бошқариш учун ҳуқуқингиз етарли эмас</p>
      </div>
    );
  }

  const roleOptions = Object.keys(ROLE_PERMISSIONS).map(key => ({
    value: key,
    label: ROLE_PERMISSIONS[key as keyof typeof ROLE_PERMISSIONS].label,
    icon: ROLE_PERMISSIONS[key as keyof typeof ROLE_PERMISSIONS].icon
  }));

  const showRegionFields = ['ffm', 'rm', 'mp'].includes(formData.role);
  const showProductGroupFields = ['ffm', 'rm', 'mp'].includes(formData.role);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👥 Фойдаланувчилар бошқаруви</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fixExistingMPs} 
            style={{ padding: '10px 20px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            🔗 MP ларни боғлаш
          </button>
          <button onClick={handleExport} style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>➕ Фойдаланувчи қўшиш</button>
        </div>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* FOYDALANUVCHILAR JADVALI */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>№</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Исм</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Рол</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳудуд</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Препарат гуруҳи</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳолат</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ҳаракатлар</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай фойдаланувчи топилмади</td></tr>
              ) : (
                users.map((u, index) => {
                  const roleInfo = ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS];
                  const regionNames = u.regions?.map(r => regions.find(reg => reg.id === r)?.name || r).join(', ') || '-';
                  const districtNames = getDistrictNames(u.districts || [], districts);
                  const groupNames = u.productGroupIds?.map(g => productGroups.find(pg => pg.id === g)?.name || g).join(', ') || '-';

                  return (
                    <tr key={u.uid} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{u.name}</td>
                      <td style={{ padding: '10px 14px' }}>{u.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#e8ecf1', fontSize: '12px' }}>
                          {roleInfo?.icon || '👤'} {roleInfo?.label || u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        {districtNames !== '-' ? '📍 ' + districtNames : regionNames}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>{groupNames}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '4px',
                          background: u.isActive ? '#d4edda' : '#f8d7da',
                          color: u.isActive ? '#155724' : '#721c24',
                          fontSize: '12px'
                        }}>
                          {u.isActive ? '✅ Фаол' : '❌ Фаол эмас'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => handleEdit(u)} style={{ padding: '4px 12px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                        {u.role !== 'superadmin' && (
                          <button onClick={() => handleDeleteUser(u.uid)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL ===== */}
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
            maxWidth: '700px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingUser ? '✏️ Фойдаланувчини таҳрирлаш' : '➕ Янги фойдаланувчи қўшиш'}</h3>

            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* SHAXSIY MA'LUMOTLAR */}
              <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#667eea' }}>👤 Шахсий маълумотлар</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Исм *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={!!editingUser} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Парол *</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={6} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Рол *</label>
                <select value={formData.role} onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setFormData({
                    ...formData,
                    role: newRole,
                    regions: [],
                    districts: [],
                    productGroupIds: [],
                    productGroupId: '',
                    managerId: '',
                    ffmId: ''
                  });
                }} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                <select value={String(formData.isActive)} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="true">✅ Фаол</option>
                  <option value="false">❌ Фаол эмас</option>
                </select>
              </div>

              {/* HUDUD MA'LUMOTLARI */}
              {showRegionFields && (
                <>
                  <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                    <strong style={{ color: '#667eea' }}>📍 Ҳудуд маълумотлари</strong>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>🏢 Вилоятлар (бир нечта танлаш мумкин) *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', background: '#fafafa' }}>
                      {regions.length === 0 ? (
                        <div style={{ color: '#999', padding: '10px' }}>⏳ Вилоятлар юкланмоқда...</div>
                      ) : (
                        regions.map(r => {
                          const isChecked = formData.regions.includes(r.id);
                          return (
                            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', background: isChecked ? '#e8ecf1' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked} onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, regions: [...formData.regions, r.id] });
                                } else {
                                  setFormData({
                                    ...formData,
                                    regions: formData.regions.filter(id => id !== r.id),
                                    districts: formData.districts.filter(d => districts.find(dd => dd.id === d)?.regionId !== r.id)
                                  });
                                }
                              }} />
                              {r.name}
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {formData.regions.length === 0 ? '⚠️ Ҳеч бўлмаса битта вилоят танланг' : '✅ ' + formData.regions.length + ' та вилоят танланди'}
                    </div>
                  </div>

                  {formData.regions.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📍 Туманар (бир нечта танлаш мумкин) *</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', background: '#fafafa' }}>
                        {filteredDistricts.length === 0 ? (
                          <div style={{ color: '#999', fontSize: '13px' }}>Танланган вилоятларга тегишли туманлар йўқ</div>
                        ) : (
                          filteredDistricts.map(d => {
                            const isChecked = formData.districts.includes(d.id);
                            return (
                              <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', background: isChecked ? '#e8ecf1' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, districts: [...formData.districts, d.id] });
                                  } else {
                                    setFormData({ ...formData, districts: formData.districts.filter(id => id !== d.id) });
                                  }
                                }} />
                                {d.name}
                              </label>
                            );
                          })
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        {formData.districts.length > 0 ? '✅ ' + formData.districts.length + ' та тумон танланди' : '⚠️ Ҳеч бўлмаса битта тумон танланг'}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PREPARAT GURUHI */}
              {showProductGroupFields && (
                <>
                  <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                    <strong style={{ color: '#667eea' }}>💊 Препарат маълумотлари</strong>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>💊 Препарат гуруҳи (бир нечта танлаш мумкин) *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', background: '#fafafa' }}>
                      {productGroups.length === 0 ? (
                        <div style={{ color: '#999', fontSize: '13px' }}>Препарат гуруҳлари топилмади</div>
                      ) : (
                        productGroups.map(g => {
                          const isChecked = formData.productGroupIds.includes(g.id);
                          return (
                            <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', background: isChecked ? '#e8ecf1' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked} onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, productGroupIds: [...formData.productGroupIds, g.id] });
                                } else {
                                  setFormData({ ...formData, productGroupIds: formData.productGroupIds.filter(id => id !== g.id) });
                                }
                              }} />
                              {g.name}
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {formData.productGroupIds.length > 0 ? '✅ ' + formData.productGroupIds.length + ' та гуруҳ танланди' : '⚠️ Ҳеч бўлмаса битта гуруҳ танланг'}
                    </div>
                  </div>
                </>
              )}

              {/* BO'YSUNISH */}
              {formData.role === 'rm' && (
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>👤 FFM га боғлаш (ихтиёрий)</label>
                  <select value={formData.managerId} onChange={(e) => setFormData({...formData, managerId: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="">FFM танланг</option>
                    {ffmList.map(f => (
                      <option key={f.uid} value={f.uid}>{f.name} ({f.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === 'mp' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                      👤 RM га боғлаш {formData.managerId ? '✅' : '(автоматик)'}
                    </label>
                    <select 
                      value={formData.managerId} 
                      onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                    >
                      <option value="">🔍 Автоматик танлаш</option>
                      {rmList.map(r => (
                        <option key={r.uid} value={r.uid}>
                          {r.name} ({r.email})
                          {r.districts?.length ? ` - ${r.districts.length} ta tuman` : ''}
                        </option>
                      ))}
                    </select>
                    {rmList.length === 0 && (
                      <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>
                        ⚠️ RM lar topilmadi! Avval RM qo'shing.
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>👤 FFM га боғлаш (ихтиёрий)</label>
                    <select value={formData.ffmId} onChange={(e) => setFormData({...formData, ffmId: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <option value="">FFM танланг</option>
                      {ffmList.map(f => (
                        <option key={f.uid} value={f.uid}>{f.name} ({f.email})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* BUTTONLAR */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); setEditingUser(null); }} style={{ flex: 1, padding: '10px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ flex: 2, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {editingUser ? 'Янгилаш' : 'Сақлаш'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;