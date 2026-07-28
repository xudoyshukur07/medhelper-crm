import React, { useState, useEffect, useRef } from 'react';
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
  where,
  getDocs
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// ============ INTERFACES ============

interface Role {
  id: string;
  name: string;
  label: string;
  icon: string;
  description?: string;
  permissions: {
    canViewAll: boolean;
    canEditAll: boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManageModules: boolean;
    canManageRegions: boolean;
    canManageDistricts: boolean;
    canManageProducts: boolean;
    canManagePlans: boolean;
    canManageVisits: boolean;
    canManagePrescriptions: boolean;
    canManageTemplates: boolean;
    canExport: boolean;
    canPrint: boolean;
  };
  isActive: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
  usersCount?: number;
}

interface Permission {
  key: string;
  label: string;
  icon: string;
  description: string;
  category: 'general' | 'users' | 'modules' | 'data' | 'actions';
}

// ============ PERMISSIONS DEFINITION ============
const ALL_PERMISSIONS: Permission[] = [
  // General
  { key: 'canViewAll', label: 'Barcha ma\'lumotlarni ko\'rish', icon: '👁️', description: 'Barcha ma\'lumotlarni ko\'rish imkoniyati', category: 'general' },
  { key: 'canEditAll', label: 'Barcha ma\'lumotlarni tahrirlash', icon: '✏️', description: 'Barcha ma\'lumotlarni tahrirlash imkoniyati', category: 'general' },
  
  // Users
  { key: 'canManageUsers', label: 'Foydalanuvchilar boshqaruvi', icon: '👥', description: 'Foydalanuvchilar qo\'shish, tahrirlash, o\'chirish', category: 'users' },
  { key: 'canManageRoles', label: 'Rollar boshqaruvi', icon: '🎭', description: 'Rollar qo\'shish, tahrirlash, o\'chirish', category: 'users' },
  
  // Modules
  { key: 'canManageModules', label: 'Modullar boshqaruvi', icon: '📦', description: 'Modullarni yoqish/o\'chirish', category: 'modules' },
  { key: 'canManageRegions', label: 'Viloyatlar boshqaruvi', icon: '🏢', description: 'Viloyatlar qo\'shish, tahrirlash, o\'chirish', category: 'modules' },
  { key: 'canManageDistricts', label: 'Tumanlar boshqaruvi', icon: '📍', description: 'Tumanlar qo\'shish, tahrirlash, o\'chirish', category: 'modules' },
  { key: 'canManageProducts', label: 'Preparatlar boshqaruvi', icon: '💊', description: 'Preparatlar qo\'shish, tahrirlash, o\'chirish', category: 'modules' },
  
  // Data
  { key: 'canManagePlans', label: 'Rejalar boshqaruvi', icon: '📅', description: 'Rejalar qo\'shish, tahrirlash, o\'chirish', category: 'data' },
  { key: 'canManageVisits', label: 'Tashriflar boshqaruvi', icon: '📋', description: 'Tashriflar qo\'shish, tahrirlash, o\'chirish', category: 'data' },
  { key: 'canManagePrescriptions', label: 'Retseptlar boshqaruvi', icon: '📄', description: 'Retseptlar qo\'shish, tahrirlash, o\'chirish', category: 'data' },
  { key: 'canManageTemplates', label: 'Shablonlar boshqaruvi', icon: '📝', description: 'Shablonlar qo\'shish, tahrirlash, o\'chirish', category: 'data' },
  
  // Actions
  { key: 'canExport', label: 'Eksport qilish', icon: '📤', description: 'Ma\'lumotlarni eksport qilish', category: 'actions' },
  { key: 'canPrint', label: 'Chop etish', icon: '🖨️', description: 'Ma\'lumotlarni chop etish', category: 'actions' },
];

// ============ DEFAULT ROLES ============
const DEFAULT_ROLES: Omit<Role, 'id' | 'createdAt' | 'usersCount'>[] = [
  {
    name: 'superadmin',
    label: 'Super Admin',
    icon: '👑',
    description: 'To\'liq boshqaruv huquqi',
    permissions: {
      canViewAll: true,
      canEditAll: true,
      canManageUsers: true,
      canManageRoles: true,
      canManageModules: true,
      canManageRegions: true,
      canManageDistricts: true,
      canManageProducts: true,
      canManagePlans: true,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: true,
      canExport: true,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'admin',
    label: 'Admin',
    icon: '🛡️',
    description: 'Kengaytirilgan boshqaruv huquqi',
    permissions: {
      canViewAll: true,
      canEditAll: true,
      canManageUsers: true,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: true,
      canManageDistricts: true,
      canManageProducts: true,
      canManagePlans: true,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: true,
      canExport: true,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'seo',
    label: 'SEO / Direktor',
    icon: '📈',
    description: 'Direktor huquqi',
    permissions: {
      canViewAll: true,
      canEditAll: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: true,
      canManagePlans: true,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: true,
      canExport: true,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'ffm',
    label: 'Field Force Manager',
    icon: '📊',
    description: 'Maydon menejeri',
    permissions: {
      canViewAll: true,
      canEditAll: true,
      canManageUsers: true,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: false,
      canManagePlans: true,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: true,
      canExport: true,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'rm',
    label: 'Regional Manager',
    icon: '📍',
    description: 'Regional menejer',
    permissions: {
      canViewAll: false,
      canEditAll: false,
      canManageUsers: true,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: false,
      canManagePlans: true,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: true,
      canExport: true,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'mp',
    label: 'Medical Promoter',
    icon: '👨‍⚕️',
    description: 'Tibbiy promotor',
    permissions: {
      canViewAll: false,
      canEditAll: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: false,
      canManagePlans: false,
      canManageVisits: true,
      canManagePrescriptions: true,
      canManageTemplates: false,
      canExport: false,
      canPrint: true,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'hr',
    label: 'HR / Kadrlar',
    icon: '👥',
    description: 'Kadrlar bo\'limi',
    permissions: {
      canViewAll: true,
      canEditAll: false,
      canManageUsers: true,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: false,
      canManagePlans: false,
      canManageVisits: false,
      canManagePrescriptions: false,
      canManageTemplates: false,
      canExport: false,
      canPrint: false,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
  {
    name: 'pm',
    label: 'Product Manager',
    icon: '💊',
    description: 'Product menejer',
    permissions: {
      canViewAll: true,
      canEditAll: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: true,
      canManagePlans: false,
      canManageVisits: false,
      canManagePrescriptions: false,
      canManageTemplates: true,
      canExport: true,
      canPrint: false,
    },
    isActive: true,
    isSystem: true,
    createdBy: 'system',
  },
];

const Roles: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // ✅ DEFAULT ROLLAR YARATILGANLIGINI TEKSHIRISH UCHUN REF
  const defaultRolesCreated = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    label: '',
    icon: '👤',
    description: '',
    permissions: {
      canViewAll: false,
      canEditAll: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageModules: false,
      canManageRegions: false,
      canManageDistricts: false,
      canManageProducts: false,
      canManagePlans: false,
      canManageVisits: false,
      canManagePrescriptions: false,
      canManageTemplates: false,
      canExport: false,
      canPrint: false,
    },
    isActive: true,
  });

  const canManageRoles = user?.role === 'superadmin' || user?.role === 'admin';

  // ============ LOAD DATA ============
  useEffect(() => {
    const rolesUnsubscribe = onSnapshot(
      collection(db, 'roles'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Role));
        setRoles(data);
        setLoading(false);
        
        // ✅ FAQAT ROLLAR BO'SH BO'LSA VA HALI YARATILMAGAN BO'LSA
        if (data.length === 0 && !defaultRolesCreated.current) {
          createDefaultRoles();
        }
      },
      (error) => {
        console.error('❌ Rollar yuklashda xatolik:', error);
        setLoading(false);
      }
    );

    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(data);
      }
    );

    return () => {
      rolesUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  // ============ CREATE DEFAULT ROLES (FAQAT BIR MARTA) ============
  const createDefaultRoles = async () => {
    // ✅ Agar allaqachon yaratilgan bo'lsa, qayta yaratma
    if (defaultRolesCreated.current) {
      console.log('✅ Default rollar allaqachon yaratilgan');
      return;
    }

    try {
      let createdCount = 0;
      for (const role of DEFAULT_ROLES) {
        await addDoc(collection(db, 'roles'), {
          ...role,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || 'system',
        });
        createdCount++;
        console.log(`✅ Rol yaratildi: ${role.label}`);
      }
      
      defaultRolesCreated.current = true;
      setSuccess(`✅ ${createdCount} ta default rol yaratildi!`);
      
      // Rollarni qayta yuklash
      const snapshot = await getDocs(collection(db, 'roles'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Role));
      setRoles(data);
      
    } catch (error: any) {
      console.error('❌ Xatolik:', error);
      setError('❌ Xatolik: ' + error.message);
    }
  };

  // ============ CRUD ============
  const handleSave = async () => {
    if (!formData.name || !formData.label) {
      setError('Nomi va label majburiy!');
      return;
    }

    try {
      if (editingRole) {
        await updateDoc(doc(db, 'roles', editingRole.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        setSuccess('✅ Rol yangilandi!');
      } else {
        await addDoc(collection(db, 'roles'), {
          ...formData,
          isSystem: false,
          isActive: true,
          createdBy: user?.uid || '',
          createdAt: serverTimestamp(),
        });
        setSuccess('✅ Rol yaratildi!');
      }
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setError('❌ Xatolik: ' + error.message);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      setError('⚠️ Tizim rollarini o\'chirib bo\'lmaydi!');
      return;
    }
    if (!confirm(`"${role.label}" rolini o\'chirmoqchimisiz?`)) return;

    try {
      await deleteDoc(doc(db, 'roles', role.id));
      setSuccess('✅ Rol o\'chirildi!');
    } catch (error: any) {
      setError('❌ Xatolik: ' + error.message);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      label: role.label,
      icon: role.icon || '👤',
      description: role.description || '',
      permissions: role.permissions,
      isActive: role.isActive,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      icon: '👤',
      description: '',
      permissions: {
        canViewAll: false,
        canEditAll: false,
        canManageUsers: false,
        canManageRoles: false,
        canManageModules: false,
        canManageRegions: false,
        canManageDistricts: false,
        canManageProducts: false,
        canManagePlans: false,
        canManageVisits: false,
        canManagePrescriptions: false,
        canManageTemplates: false,
        canExport: false,
        canPrint: false,
      },
      isActive: true,
    });
    setEditingRole(null);
    setError('');
  };

  // ============ FILTERS ============
  const getFilteredRoles = () => {
    let filtered = roles;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.label.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.isActive === (filterCategory === 'active'));
    }

    return filtered;
  };

  const filteredRoles = getFilteredRoles();

  // ============ GET USERS COUNT ============
  const getUsersCount = (roleName: string) => {
    return users.filter(u => u.role === roleName).length;
  };

  // ============ PERMISSION CATEGORIES ============
  const permissionCategories = [
    { key: 'all', label: '📋 Barcha' },
    { key: 'general', label: '⚙️ Umumiy' },
    { key: 'users', label: '👥 Foydalanuvchilar' },
    { key: 'modules', label: '📦 Modullar' },
    { key: 'data', label: '📊 Ma\'lumotlar' },
    { key: 'actions', label: '🔧 Harakatlar' },
  ];

  const getPermissionsByCategory = (category: string) => {
    if (category === 'all') return ALL_PERMISSIONS;
    return ALL_PERMISSIONS.filter(p => p.category === category);
  };

  // ============ RENDER ============
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Yuklanmoqda...</div>;
  }

  if (!canManageRoles) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⛔ Ҳуқуқингиз йўқ</h2>
        <p>Ролларни бошқариш учун ҳуқуқингиз етарли эмас</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0 }}>🎭 Rollar va Ruxsatlar ({filteredRoles.length})</h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="all">📋 Barcha</option>
            <option value="active">✅ Faol</option>
            <option value="inactive">❌ Faol emas</option>
          </select>

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
            ➕ Rol qo'shish
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Roles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
        {filteredRoles.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#999', background: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎭</div>
            <p>Hech qanday rol topilmadi</p>
          </div>
        ) : (
          filteredRoles.map((role) => {
            const usersCount = getUsersCount(role.name);
            const isActive = role.isActive !== false;
            
            return (
              <div key={role.id} style={{
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                borderLeft: isActive ? '4px solid #28a745' : '4px solid #dc3545',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{role.icon || '👤'}</span>
                      <h4 style={{ margin: 0 }}>{role.label}</h4>
                      {role.isSystem && (
                        <span style={{ fontSize: '10px', background: '#cce5ff', color: '#004085', padding: '2px 8px', borderRadius: '4px' }}>
                          🔒 Tizim
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      <code style={{ background: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>{role.name}</code>
                      {role.description && <span style={{ marginLeft: '8px' }}>- {role.description}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      background: isActive ? '#d4edda' : '#f8d7da',
                      color: isActive ? '#155724' : '#721c24'
                    }}>
                      {isActive ? '✅ Faol' : '❌ Faol emas'}
                    </span>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      👥 {usersCount} ta foydalanuvchi
                    </div>
                  </div>
                </div>

                {/* Permissions summary */}
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.entries(role.permissions || {})
                    .filter(([key, value]) => value === true)
                    .slice(0, 6)
                    .map(([key]) => {
                      const perm = ALL_PERMISSIONS.find(p => p.key === key);
                      return perm ? (
                        <span key={key} style={{
                          fontSize: '10px',
                          background: '#e8ecf1',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#555'
                        }}>
                          {perm.icon} {perm.label}
                        </span>
                      ) : null;
                    })}
                  {Object.entries(role.permissions || {}).filter(([key, value]) => value === true).length > 6 && (
                    <span style={{ fontSize: '10px', color: '#888' }}>
                      +{Object.entries(role.permissions || {}).filter(([key, value]) => value === true).length - 6} ta
                    </span>
                  )}
                </div>

                {!role.isSystem && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    marginTop: '12px',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '10px'
                  }}>
                    <button
                      onClick={() => handleEdit(role)}
                      style={{ padding: '4px 12px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✏️ Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      style={{ padding: '4px 12px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {editingRole ? '✏️ Rolni tahrirlash' : '➕ Yangi rol yaratish'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📛 Nomi (kod) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Masalan: admin"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  disabled={!!editingRole}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>🏷️ Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  placeholder="Masalan: Administrator"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>🔣 Ikon</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="👤"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>📝 Tavsif</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Rol tavsifi"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>✅ Holat</label>
              <select
                value={String(formData.isActive)}
                onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="true">✅ Faol</option>
                <option value="false">❌ Faol emas</option>
              </select>
            </div>

            {/* Permissions */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#764ba2' }}>🔑 Ruxsatlar</strong>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {permissionCategories.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setFilterCategory(cat.key)}
                      style={{
                        padding: '2px 10px',
                        fontSize: '11px',
                        background: filterCategory === cat.key ? '#667eea' : '#e8ecf1',
                        color: filterCategory === cat.key ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid #eee', 
                borderRadius: '8px', 
                padding: '10px',
                background: '#fafafa'
              }}>
                {getPermissionsByCategory(filterCategory).map(perm => (
                  <label key={perm.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8ecf1'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={(formData.permissions as any)[perm.key] || false}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [perm.key]: e.target.checked
                          }
                        });
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>{perm.icon}</span>
                    <span style={{ fontSize: '13px', flex: 1 }}>{perm.label}</span>
                    <span style={{ fontSize: '11px', color: '#999' }}>{perm.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ padding: '12px', flex: 1, background: '#e8ecf1', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
              >
                ❌ Bekor qilish
              </button>
              <button
                onClick={handleSave}
                style={{ padding: '12px', flex: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
              >
                {editingRole ? '🔄 Yangilash' : '💾 Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;