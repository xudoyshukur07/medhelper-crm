import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ===== ROLLAR =====
export type UserRole = 'superadmin' | 'seo' | 'ffm' | 'pm' | 'hr' | 'ofm' | 'rm' | 'mp';

// ===== FOYDALANUVCHI INTERFACE =====
export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  
  // Hudud
  regions?: string[];
  districts?: any[];
  districtId?: string;
  districtName?: string;
  districtIds?: string[];
  
  // Preparat guruhi
  productGroupIds?: string[];
  productGroupId?: string;
  
  // Bo'ysunish
  managerId?: string;
  ffmId?: string;
  rmId?: string;
  subordinates?: string[];
  
  // Yulduzcha
  favoriteDoctors?: { [key: string]: boolean };
  favoriteDoctorsList?: string[];
  favoriteDoctorsCount?: number;
  
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

// ===== HUQUQLAR =====
export const ROLE_PERMISSIONS = {
  superadmin: {
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
    canExport: true,
    label: 'Super Admin',
    icon: '👑'
  },
  seo: {
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
    canExport: true,
    label: 'SEO / Direktor',
    icon: '📈'
  },
  ffm: {
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
    canExport: true,
    label: 'Field Force Manager',
    icon: '📊'
  },
  pm: {
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
    canExport: true,
    label: 'Product Manager',
    icon: '💊'
  },
  hr: {
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
    canExport: false,
    label: 'HR / Kadrlar',
    icon: '👥'
  },
  ofm: {
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
    canExport: false,
    label: 'Office Manager',
    icon: '🏢'
  },
  rm: {
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
    canExport: true,
    label: 'Regional Manager',
    icon: '📍'
  },
  mp: {
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
    canExport: false,
    label: 'Medical Promoter',
    icon: '👨‍⚕️'
  }
};

// ===== AUTH CONTEXT =====
interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS.superadmin) => boolean;
  canViewAll: boolean;
  canEditAll: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  getUserFilter: () => any;
  refreshUser: () => Promise<void>;
  autoAssignManager: (userData: any) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // YORDAMCHI FUNKSIYA: District ID larni olish
  // ==========================================
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

  // ==========================================
  // AVTOMATIK BOG'LASH (TUZATILGAN)
  // ==========================================
  const autoAssignManager = async (userData: any): Promise<string | null> => {
    if (userData.role !== 'mp') return null;

    // District ID larni olish
    const districtIds = extractDistrictIds(userData.districts || []);
    const mpProductGroupId = userData.productGroupId || 
      (userData.productGroupIds && userData.productGroupIds.length > 0 ? userData.productGroupIds[0] : null);

    console.log('🔍 autoAssignManager:');
    console.log('📍 District IDs:', districtIds);
    console.log('💊 ProductGroup ID:', mpProductGroupId);

    if (districtIds.length === 0 || !mpProductGroupId) {
      console.log('⚠️ MP uchun district yoki productGroup topilmadi');
      return null;
    }

    try {
      const managersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['rm', 'ffm']),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(managersQuery);
      let matchedManager: any = null;
      let matchedManagerUid: string | null = null;

      snapshot.docs.forEach(doc => {
        const manager = doc.data();
        const managerDistrictIds = extractDistrictIds(manager.districts || []);
        const managerProductGroups = manager.productGroupIds || [];

        const districtMatch = districtIds.some((dId: string) => managerDistrictIds.includes(dId));
        const productMatch = managerProductGroups.includes(mpProductGroupId);

        console.log(`📊 ${manager.name}: districtMatch=${districtMatch}, productMatch=${productMatch}`);

        if (districtMatch && productMatch) {
          matchedManager = { uid: doc.id, ...manager };
          matchedManagerUid = doc.id;
        }
      });

      if (matchedManager && matchedManagerUid) {
        console.log('✅ Avtomatik bog\'landi:', matchedManager.name, '→', userData.name);
        
        const managerRef = doc(db, 'users', matchedManagerUid);
        const managerDoc = await getDoc(managerRef);
        if (managerDoc.exists()) {
          const managerData = managerDoc.data();
          const subordinates = managerData.subordinates || [];
          if (!subordinates.includes(userData.uid)) {
            await updateDoc(managerRef, { 
              subordinates: [...subordinates, userData.uid],
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        return matchedManagerUid;
      }
      
      console.log('⚠️ Mos keladigan manager topilmadi');
      return null;
      
    } catch (error) {
      console.error('AutoAssign xatolik:', error);
      return null;
    }
  };

  // ==========================================
  // USER MA'LUMOTLARINI YUKLASH
  // ==========================================
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('📋 Firestore dan olingan ma\'lumotlar:', data);
        console.log('📍 districtId:', data.districtId);
        console.log('📍 districts:', data.districts);
        console.log('👥 subordinates:', data.subordinates);
        console.log('🎯 role:', data.role);
        
        setUser({ 
          uid: firebaseUser.uid, 
          email: firebaseUser.email || '',
          ...data 
        } as User);
      } else {
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email || 'User',
          role: 'mp',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setUser(newUser);
      }
    } catch (error) {
      console.error('Foydalanuvchi ma\'lumotlarini olishda xatolik:', error);
    }
  };

  // ==========================================
  // USER MA'LUMOTLARINI YANGILASH
  // ==========================================
  const refreshUser = async () => {
    if (!firebaseUser) {
      console.log('⚠️ Firebase user mavjud emas');
      return;
    }
    console.log('🔄 User ma\'lumotlari yangilanmoqda...');
    await loadUserData(firebaseUser);
    console.log('✅ User ma\'lumotlari yangilandi!');
  };

  // ===== Firebase Auth holatini kuzatish =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        await loadUserData(firebaseUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(userCredential.user);
      return true;
    } catch (error: any) {
      console.error('Login xatolik:', error.message);
      return false;
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout xatolik:', error);
    }
  };

  // ==========================================
  // HUQUQNI TEKSHIRISH
  // ==========================================
  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS.superadmin): boolean => {
    if (!user) return false;
    const role = user.role as keyof typeof ROLE_PERMISSIONS;
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions[permission] : false;
  };

  // ==========================================
  // FILTR OLISH
  // ==========================================
  const getUserFilter = () => {
    if (!user) return {};
    
    switch (user.role) {
      case 'superadmin':
      case 'seo':
      case 'pm':
      case 'hr':
        return {};
        
      case 'ffm':
        return {
          regionId: { in: user.regions || [] },
          districtId: { in: user.districts || [] },
          productGroupId: { in: user.productGroupIds || [] }
        };
        
      case 'rm':
        return {
          regionId: { in: user.regions || [] },
          districtId: { in: user.districts || [] },
          productGroupId: { in: user.productGroupIds || [] }
        };
        
      case 'mp':
        return {
          districtId: user.districtId,
          productGroupId: user.productGroupId,
          userId: user.uid
        };
        
      case 'ofm':
        return {
          officeId: user.uid
        };
        
      default:
        return { userId: user.uid };
    }
  };

  // ==========================================
  // COMPUTED
  // ==========================================
  const canViewAll = hasPermission('canViewAll');
  const canEditAll = hasPermission('canEditAll');
  const canManageUsers = hasPermission('canManageUsers');
  const canManageRoles = hasPermission('canManageRoles');

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        logout,
        isAuthenticated: !!user && user.isActive !== false,
        hasPermission,
        canViewAll,
        canEditAll,
        canManageUsers,
        canManageRoles,
        getUserFilter,
        refreshUser,
        autoAssignManager
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};