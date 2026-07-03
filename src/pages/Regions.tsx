import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase/config';
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
  orderBy
} from 'firebase/firestore';

// ============================================================
// VILOYATLAR VA TUMANLAR
// ============================================================

const VILOYATLAR: string[] = [
  'Qoraqalpogiston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati',
  'Jizzax viloyati', 'Qashqadaryo viloyati', 'Navoiy viloyati',
  'Namangan viloyati', 'Samarqand viloyati', 'Surxondaryo viloyati',
  'Sirdaryo viloyati', 'Toshkent viloyati', 'Fargona viloyati',
  'Xorazm viloyati', 'Toshkent shahri'
];

const TUMANLAR: Record<string, string[]> = {
  'Qoraqalpogiston Respublikasi': ['Nukus shahri', 'Amudaryo tumani', 'Beruniy tumani', 'Bozatov tumani', 'Qanlikol tumani', 'Qorauzak tumani', 'Kegeyli tumani', 'Moynoq tumani', 'Nukus tumani', 'Qongirot tumani', 'Taxtakopir tumani', 'Turtkul tumani', 'Xojayli tumani', 'Chimboy tumani', 'Ellikqala tumani', 'Taxiatosh shahri'],
  'Andijon viloyati': ['Andijon shahri', 'Andijon tumani', 'Asaka tumani', 'Baliqchi tumani', 'Buloqboshi tumani', 'Jalaquduq tumani', 'Izboskan tumani', 'Qorgontepa tumani', 'Marhamat tumani', 'Oltinkol tumani', 'Paxtaobod tumani', 'Xonobod shahri', 'Xojaobod tumani', 'Shahrixon tumani'],
  'Buxoro viloyati': ['Buxoro shahri', 'Buxoro tumani', 'Vobkent tumani', 'Gijduvon tumani', 'Jondor tumani', 'Kogon tumani', 'Kogon shahri', 'Qorakol tumani', 'Qorovulbozor tumani', 'Olot tumani', 'Peshku tumani', 'Romitan tumani', 'Shofirkon tumani'],
  'Jizzax viloyati': ['Jizzax shahri', 'Arnasoy tumani', 'Baxmal tumani', 'Gallarol tumani', 'Dostlik tumani', 'Zarbdor tumani', 'Zafarobod tumani', 'Zomin tumani', 'Mirzachol tumani', 'Paxtakor tumani', 'Forish tumani', 'Sharof Rashidov tumani', 'Yangiobod tumani'],
  'Qashqadaryo viloyati': ['Qarshi shahri', 'Guzor tumani', 'Dehqonobod tumani', 'Qamashi tumani', 'Qarshi tumani', 'Koson tumani', 'Kitob tumani', 'Mirishkor tumani', 'Muborak tumani', 'Nishon tumani', 'Chiroqchi tumani', 'Shahrisabz shahri', 'Shahrisabz tumani', 'Yakkabog tumani'],
  'Navoiy viloyati': ['Navoiy shahri', 'Zarafshon shahri', 'Gozgon shahri', 'Karmana tumani', 'Qiziltepa tumani', 'Konimex tumani', 'Navbahor tumani', 'Nurota tumani', 'Tomdi tumani', 'Uchquduq tumani', 'Xatirchi tumani'],
  'Namangan viloyati': ['Namangan shahri', 'Namangan tumani', 'Kosonsoy tumani', 'Mingbuloq tumani', 'Norin tumani', 'Pop tumani', 'Toraqorgon tumani', 'Uchqorgon tumani', 'Uychi tumani', 'Chortoq tumani', 'Chust tumani', 'Yangiqorgon tumani'],
  'Samarqand viloyati': ['Samarqand shahri', 'Bulungur tumani', 'Jomboy tumani', 'Ishtixon tumani', 'Kattaqorgon shahri', 'Kattaqorgon tumani', 'Narpay tumani', 'Nurobod tumani', 'Oqdaryo tumani', 'Pastdargom tumani', 'Paxtachi tumani', 'Payariq tumani', 'Samarqand tumani', 'Toyloq tumani', 'Urgut tumani'],
  'Surxondaryo viloyati': ['Termiz shahri', 'Angor tumani', 'Boysun tumani', 'Denov tumani', 'Jarqorgon tumani', 'Qiziriq tumani', 'Qumqorgon tumani', 'Muzrabot tumani', 'Oltinsoy tumani', 'Sariosiyo tumani', 'Termiz tumani', 'Uzun tumani', 'Sherobod tumani', 'Shorchi tumani'],
  'Sirdaryo viloyati': ['Guliston shahri', 'Boyovut tumani', 'Guliston tumani', 'Mirzaobod tumani', 'Oqoltin tumani', 'Sayxunobod tumani', 'Sardoba tumani', 'Sirdaryo tumani', 'Xovos tumani', 'Shirin shahri', 'Yangiyer shahri'],
  'Toshkent viloyati': ['Nurafshon shahri', 'Ohangaron shahri', 'Olmaliq shahri', 'Angren shahri', 'Bekobod shahri', 'Chirchiq shahri', 'Yangiyol shahri', 'Oqqorgon tumani', 'Ohangaron tumani', 'Bostanliq tumani', 'Boka tumani', 'Zangiota tumani', 'Qibray tumani', 'Quyichirchiq tumani', 'Parkent tumani', 'Piskent tumani', 'Ortachirchiq tumani', 'Toshkent tumani', 'Chinoz tumani', 'Yuqorichirchiq tumani', 'Yangiyol tumani'],
  'Fargona viloyati': ['Fargona shahri', 'Qoqon shahri', 'Margilon shahri', 'Quvasoy shahri', 'Beshariq tumani', 'Bogdod tumani', 'Buvayda tumani', 'Dangara tumani', 'Yozyovon tumani', 'Quva tumani', 'Oltiariq tumani', 'Rishton tumani', 'Sox tumani', 'Toshloq tumani', 'Uchkoprik tumani', 'Ozbekiston tumani', 'Fargona tumani', 'Furqat tumani'],
  'Xorazm viloyati': ['Urganch shahri', 'Xiva shahri', 'Bogot tumani', 'Gurlan tumani', 'Qoshkopir tumani', 'Tuproqqala tumani', 'Urganch tumani', 'Xazorasp tumani', 'Xonqa tumani', 'Shovot tumani', 'Yangiariq tumani', 'Yangibozor tumani'],
  'Toshkent shahri': ['Bektemir tumani', 'Mirzo Ulugbek tumani', 'Mirobod tumani', 'Olmazor tumani', 'Sergeli tumani', 'Uchtepa tumani', 'Chilonzor tumani', 'Shayxontohur tumani', 'Yunusobod tumani', 'Yakkasaroy tumani', 'Yangihayot tumani', 'Yashnobod tumani']
};

// ============================================================
// INTERFACES
// ============================================================

interface Zone {
  id: string;
  name: string;
  code: string;
  description: string;
  groupId: string;
  groupName: string;
  viloyatlar: string[];
  tumanlar: string[];
  isActive: boolean;
  userId: string;
  createdAt: any;
}

interface Region {
  id: string;
  name: string;
  code: string;
  description: string;
  groupId: string;
  groupName: string;
  zoneIds: string[];
  zoneNames: string[];
  isActive: boolean;
  userId: string;
  createdAt: any;
}

interface Assignment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  regionIds: string[];
  regionNames: string[];
  zoneIds: string[];
  zoneNames: string[];
  isActive: boolean;
  createdAt: any;
}

interface Group {
  id: string;
  name: string;
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

// ============================================================
// ASOSIY KOMPONENT
// ============================================================

const Regions: React.FC = () => {
  const { user } = useAuth();
  
  const [tab, setTab] = useState<'zones' | 'regions' | 'distribution' | 'assignments'>('zones');
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'zone' | 'region' | 'assignment'>('zone');
  
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    groupId: '',
    viloyatlar: [] as string[],
    tumanlar: [] as string[]
  });

  const [regionForm, setRegionForm] = useState({
    name: '',
    description: '',
    groupId: '',
    zoneIds: [] as string[]
  });

  const [assignmentForm, setAssignmentForm] = useState({
    userId: '',
    regionIds: [] as string[],
    zoneIds: [] as string[]
  });

  const canManage = user?.role === 'superadmin' || user?.role === 'seo';

  const generateCode = (name: string): string => {
    if (!name) return '';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return name.substring(0, 3).toUpperCase();
    }
    let code = '';
    for (let i = 0; i < words.length; i++) {
      if (words[i].length > 0) code += words[i][0];
    }
    return code.toUpperCase().substring(0, 3);
  };

  // ============================================================
  // FIREBASE LOAD
  // ============================================================

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'zones'), orderBy('createdAt', 'desc')), (snap) => {
      setZones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'regions'), orderBy('createdAt', 'desc')), (snap) => {
      setRegions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Region)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'userAssignments'), orderBy('createdAt', 'desc')), (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'productGroups'), where('isActive', '==', true)), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setUsers([
      { id: '1', email: 'admin@medhelper.uz', displayName: 'Admin', role: 'superadmin', region: 'Toshkent', isActive: true },
      { id: '2', email: 'ali@medhelper.uz', displayName: 'Ali Valiyev', role: 'ffm', region: 'Samarqand', isActive: true },
      { id: '3', email: 'dilora@medhelper.uz', displayName: 'Dilora Karimova', role: 'mp', region: 'Toshkent', isActive: true },
    ]);
  }, []);

  // ============================================================
  // ZONE CRUD
  // ============================================================

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!zoneForm.name || zoneForm.viloyatlar.length === 0) {
      setError('Номи ва камида 1 та вилоят танланг!');
      return;
    }

    const code = generateCode(zoneForm.name);
    const group = groups.find(g => g.id === zoneForm.groupId);
    
    const allTumanlar: string[] = [];
    zoneForm.viloyatlar.forEach((v: string) => {
      const tumans = TUMANLAR[v] || [];
      tumans.forEach((t: string) => {
        if (zoneForm.tumanlar.includes(t)) {
          allTumanlar.push(t);
        }
      });
    });

    try {
      await addDoc(collection(db, 'zones'), {
        name: zoneForm.name,
        code: code,
        description: zoneForm.description || '',
        groupId: zoneForm.groupId || '',
        groupName: group?.name || '',
        viloyatlar: zoneForm.viloyatlar,
        tumanlar: allTumanlar,
        isActive: true,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setSuccess('Зона сақланди!');
      setShowModal(false);
      resetZoneForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    const code = generateCode(zoneForm.name);
    const group = groups.find(g => g.id === zoneForm.groupId);
    
    const allTumanlar: string[] = [];
    zoneForm.viloyatlar.forEach((v: string) => {
      const tumans = TUMANLAR[v] || [];
      tumans.forEach((t: string) => {
        if (zoneForm.tumanlar.includes(t)) {
          allTumanlar.push(t);
        }
      });
    });

    try {
      await updateDoc(doc(db, 'zones', editingId), {
        name: zoneForm.name,
        code: code,
        description: zoneForm.description || '',
        groupId: zoneForm.groupId || '',
        groupName: group?.name || '',
        viloyatlar: zoneForm.viloyatlar,
        tumanlar: allTumanlar,
        updatedAt: serverTimestamp()
      });
      setSuccess('Зона янгиланди!');
      setEditingId(null);
      setShowModal(false);
      resetZoneForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Ушбу зонани ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'zones', id));
      setSuccess('Зона ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEditZone = (zone: Zone) => {
    setEditingId(zone.id);
    setZoneForm({
      name: zone.name,
      description: zone.description || '',
      groupId: zone.groupId || '',
      viloyatlar: zone.viloyatlar || [],
      tumanlar: zone.tumanlar || []
    });
    setModalType('zone');
    setShowModal(true);
  };

  const resetZoneForm = () => {
    setZoneForm({ name: '', description: '', groupId: '', viloyatlar: [], tumanlar: [] });
  };

  // ============================================================
  // REGION CRUD
  // ============================================================

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regionForm.name || regionForm.zoneIds.length === 0) {
      setError('Номи ва камида 1 та зона танланг!');
      return;
    }

    const code = generateCode(regionForm.name);
    const group = groups.find(g => g.id === regionForm.groupId);
    const selectedZones = zones.filter(z => regionForm.zoneIds.includes(z.id));

    try {
      await addDoc(collection(db, 'regions'), {
        name: regionForm.name,
        code: code,
        description: regionForm.description || '',
        groupId: regionForm.groupId || '',
        groupName: group?.name || '',
        zoneIds: regionForm.zoneIds,
        zoneNames: selectedZones.map(z => z.name),
        isActive: true,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setSuccess('Регион сақланди!');
      setShowModal(false);
      resetRegionForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    const code = generateCode(regionForm.name);
    const group = groups.find(g => g.id === regionForm.groupId);
    const selectedZones = zones.filter(z => regionForm.zoneIds.includes(z.id));

    try {
      await updateDoc(doc(db, 'regions', editingId), {
        name: regionForm.name,
        code: code,
        description: regionForm.description || '',
        groupId: regionForm.groupId || '',
        groupName: group?.name || '',
        zoneIds: regionForm.zoneIds,
        zoneNames: selectedZones.map(z => z.name),
        updatedAt: serverTimestamp()
      });
      setSuccess('Регион янгиланди!');
      setEditingId(null);
      setShowModal(false);
      resetRegionForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (!confirm('Ушбу регионни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'regions', id));
      setSuccess('Регион ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEditRegion = (region: Region) => {
    setEditingId(region.id);
    setRegionForm({
      name: region.name,
      description: region.description || '',
      groupId: region.groupId || '',
      zoneIds: region.zoneIds || []
    });
    setModalType('region');
    setShowModal(true);
  };

  const resetRegionForm = () => {
    setRegionForm({ name: '', description: '', groupId: '', zoneIds: [] });
  };

  // ============================================================
  // ASSIGNMENT CRUD
  // ============================================================

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!assignmentForm.userId) {
      setError('Фойдаланувчи танланг!');
      return;
    }

    try {
      const userObj = users.find(u => u.id === assignmentForm.userId);
      const selectedRegions = regions.filter(r => assignmentForm.regionIds.includes(r.id));
      const selectedZones = zones.filter(z => assignmentForm.zoneIds.includes(z.id));
      
      await addDoc(collection(db, 'userAssignments'), {
        userId: assignmentForm.userId,
        userEmail: userObj?.email || '',
        userName: userObj?.displayName || '',
        regionIds: assignmentForm.regionIds,
        regionNames: selectedRegions.map(r => r.name),
        zoneIds: assignmentForm.zoneIds,
        zoneNames: selectedZones.map(z => z.name),
        isActive: true,
        createdBy: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setSuccess('Фойдаланувчига бириктирилди!');
      setShowModal(false);
      resetAssignmentForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSuccess('');

    try {
      const userObj = users.find(u => u.id === assignmentForm.userId);
      const selectedRegions = regions.filter(r => assignmentForm.regionIds.includes(r.id));
      const selectedZones = zones.filter(z => assignmentForm.zoneIds.includes(z.id));
      
      await updateDoc(doc(db, 'userAssignments', editingId), {
        userId: assignmentForm.userId,
        userEmail: userObj?.email || '',
        userName: userObj?.displayName || '',
        regionIds: assignmentForm.regionIds,
        regionNames: selectedRegions.map(r => r.name),
        zoneIds: assignmentForm.zoneIds,
        zoneNames: selectedZones.map(z => z.name),
        updatedAt: serverTimestamp()
      });
      setSuccess('Янгиланди!');
      setEditingId(null);
      setShowModal(false);
      resetAssignmentForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Ушбу бириктиришни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'userAssignments', id));
      setSuccess('Ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setAssignmentForm({
      userId: assignment.userId,
      regionIds: assignment.regionIds || [],
      zoneIds: assignment.zoneIds || []
    });
    setModalType('assignment');
    setShowModal(true);
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({ userId: '', regionIds: [], zoneIds: [] });
  };

  // ============================================================
  // TOGGLE FUNCTIONS
  // ============================================================

  const toggleViloyat = (viloyatName: string) => {
    setZoneForm(prev => {
      const newViloyatlar = prev.viloyatlar.includes(viloyatName)
        ? prev.viloyatlar.filter(v => v !== viloyatName)
        : [...prev.viloyatlar, viloyatName];
      
      const newTumanlar = [...prev.tumanlar];
      if (newViloyatlar.includes(viloyatName)) {
        const tumans = TUMANLAR[viloyatName] || [];
        tumans.forEach((t: string) => {
          if (!newTumanlar.includes(t)) {
            newTumanlar.push(t);
          }
        });
      } else {
        const tumans = TUMANLAR[viloyatName] || [];
        tumans.forEach((t: string) => {
          const index = newTumanlar.indexOf(t);
          if (index > -1) {
            newTumanlar.splice(index, 1);
          }
        });
      }
      
      return { ...prev, viloyatlar: newViloyatlar, tumanlar: newTumanlar };
    });
  };

  const toggleTuman = (tumanName: string) => {
    setZoneForm(prev => {
      const newTumanlar = prev.tumanlar.includes(tumanName)
        ? prev.tumanlar.filter(t => t !== tumanName)
        : [...prev.tumanlar, tumanName];
      return { ...prev, tumanlar: newTumanlar };
    });
  };

  const toggleAllViloyat = () => {
    setZoneForm(prev => {
      const newViloyatlar = prev.viloyatlar.length === VILOYATLAR.length ? [] : [...VILOYATLAR];
      
      const newTumanlar: string[] = [];
      if (newViloyatlar.length === VILOYATLAR.length) {
        newViloyatlar.forEach((v: string) => {
          const tumans = TUMANLAR[v] || [];
          tumans.forEach((t: string) => {
            if (!newTumanlar.includes(t)) newTumanlar.push(t);
          });
        });
      }
      
      return { ...prev, viloyatlar: newViloyatlar, tumanlar: newTumanlar };
    });
  };

  const toggleAllTuman = () => {
    setZoneForm(prev => {
      const allTumans: string[] = [];
      prev.viloyatlar.forEach((v: string) => {
        const tumans = TUMANLAR[v] || [];
        tumans.forEach((t: string) => {
          if (!allTumans.includes(t)) allTumans.push(t);
        });
      });
      
      const newTumanlar = prev.tumanlar.length === allTumans.length ? [] : allTumans;
      return { ...prev, tumanlar: newTumanlar };
    });
  };

  const toggleZone = (zoneId: string) => {
    setRegionForm(prev => ({
      ...prev,
      zoneIds: prev.zoneIds.includes(zoneId)
        ? prev.zoneIds.filter(id => id !== zoneId)
        : [...prev.zoneIds, zoneId]
    }));
  };

  const toggleAllZones = () => {
    const allIds = zones.filter(z => z.isActive).map(z => z.id);
    setRegionForm(prev => ({
      ...prev,
      zoneIds: prev.zoneIds.length === allIds.length ? [] : allIds
    }));
  };

  const toggleRegionAssignment = (regionId: string) => {
    setAssignmentForm(prev => ({
      ...prev,
      regionIds: prev.regionIds.includes(regionId)
        ? prev.regionIds.filter(id => id !== regionId)
        : [...prev.regionIds, regionId]
    }));
  };

  const toggleAllRegions = () => {
    const allIds = regions.filter(r => r.isActive).map(r => r.id);
    setAssignmentForm(prev => ({
      ...prev,
      regionIds: prev.regionIds.length === allIds.length ? [] : allIds
    }));
  };

  const toggleZoneAssignment = (zoneId: string) => {
    setAssignmentForm(prev => ({
      ...prev,
      zoneIds: prev.zoneIds.includes(zoneId)
        ? prev.zoneIds.filter(id => id !== zoneId)
        : [...prev.zoneIds, zoneId]
    }));
  };

  const toggleAllZonesAssignment = () => {
    const allIds = zones.filter(z => z.isActive).map(z => z.id);
    setAssignmentForm(prev => ({
      ...prev,
      zoneIds: prev.zoneIds.length === allIds.length ? [] : allIds
    }));
  };

  // ============================================================
  // EXPORT
  // ============================================================

  const handleExport = () => {
    let data: any[] = [];
    let fileName = '';

    if (tab === 'zones') {
      data = zones.map((z, i) => ({
        '№': i + 1,
        'Номи': z.name,
        'Код': z.code,
        'Гуруҳ': z.groupName || '-',
        'Вилоятлар': (z.viloyatlar || []).join(', '),
        'Туманлар': (z.tumanlar || []).join(', '),
        'Ҳолат': z.isActive ? 'Фаол' : 'Фаол эмас'
      }));
      fileName = 'зоналар';
    } else if (tab === 'regions') {
      data = regions.map((r, i) => ({
        '№': i + 1,
        'Номи': r.name,
        'Код': r.code,
        'Гуруҳ': r.groupName || '-',
        'Зоналар': (r.zoneNames || []).join(', '),
        'Ҳолат': r.isActive ? 'Фаол' : 'Фаол эмас'
      }));
      fileName = 'регионлар';
    } else if (tab === 'distribution') {
      const grouped: Record<string, { regions: string[], zones: string[] }> = {};
      regions.forEach(r => {
        const key = r.groupId || 'nogroup';
        if (!grouped[key]) grouped[key] = { regions: [], zones: [] };
        if (!grouped[key].regions.includes(r.name)) grouped[key].regions.push(r.name);
        (r.zoneNames || []).forEach(z => {
          if (!grouped[key].zones.includes(z)) grouped[key].zones.push(z);
        });
      });
      data = Object.keys(grouped).map((key, i) => ({
        '№': i + 1,
        'Гуруҳ': key === 'nogroup' ? 'Гуруҳсиз' : (groups.find(g => g.id === key)?.name || key),
        'Регионлар': grouped[key].regions.join(', '),
        'Зоналар': grouped[key].zones.join(', ')
      }));
      fileName = 'таксимот';
    } else {
      data = assignments.map((a, i) => ({
        '№': i + 1,
        'Фойдаланувчи': a.userName || a.userEmail,
        'Регионлар': (a.regionNames || []).join(', '),
        'Зоналар': (a.zoneNames || []).join(', '),
        'Ҳолат': a.isActive ? 'Фаол' : 'Фаол эмас'
      }));
      fileName = 'фойдаланувчи_бириктириш';
    }

    if (data.length === 0) {
      setError('Экспорт қилиш учун маълумот йўқ!');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, fileName);
    XLSX.writeFile(wb, fileName + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
    setSuccess('Экспорт қилинди!');
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e8ecf1', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('zones')} style={{ padding: '10px 20px', background: tab === 'zones' ? '#667eea' : 'transparent', color: tab === 'zones' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: tab === 'zones' ? 'bold' : 'normal' }}>
          📌 1. Зоналар ({zones.length})
        </button>
        <button onClick={() => setTab('regions')} style={{ padding: '10px 20px', background: tab === 'regions' ? '#667eea' : 'transparent', color: tab === 'regions' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: tab === 'regions' ? 'bold' : 'normal' }}>
          📍 2. Регионлар ({regions.length})
        </button>
        <button onClick={() => setTab('distribution')} style={{ padding: '10px 20px', background: tab === 'distribution' ? '#667eea' : 'transparent', color: tab === 'distribution' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: tab === 'distribution' ? 'bold' : 'normal' }}>
          📊 3. Таксимот
        </button>
        <button onClick={() => setTab('assignments')} style={{ padding: '10px 20px', background: tab === 'assignments' ? '#667eea' : 'transparent', color: tab === 'assignments' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: tab === 'assignments' ? 'bold' : 'normal' }}>
          👤 4. Фойдаланувчилар
        </button>
      </div>

      {/* ===== 1. ZONES ===== */}
      {tab === 'zones' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: '#888' }}>Жами: {zones.length} та</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
              {canManage && (
                <button onClick={() => { resetZoneForm(); setEditingId(null); setModalType('zone'); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  ➕ Зона
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {zones.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>📭 Ҳеч қандай зона мавжуд эмас</div>
            ) : (
              zones.map((zone: Zone) => (
                <div key={zone.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4>{zone.name}</h4>
                      <div style={{ fontSize: '12px', color: '#888' }}>Код: {zone.code}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>📂 {zone.groupName || 'Гуруҳсиз'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>🏙️ {(zone.viloyatlar || []).join(', ')}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>📌 {(zone.tumanlar || []).join(', ')}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>{zone.isActive ? '✅' : '❌'}</div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditZone(zone)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDeleteZone(zone.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Zone Modal */}
          {showModal && modalType === 'zone' && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setShowModal(false); setEditingId(null); }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h3>{editingId ? '✏️ Зонани таҳрирлаш' : '📌 Янги зона'}</h3>
                <form onSubmit={editingId ? handleUpdateZone : handleAddZone}>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Зона номи *</label>
                    <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Код: {zoneForm.name ? generateCode(zoneForm.name) : 'Автоматик'}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Тавсиф</label>
                    <input type="text" value={zoneForm.description} onChange={(e) => setZoneForm({...zoneForm, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Гуруҳ</label>
                    <select value={zoneForm.groupId} onChange={(e) => setZoneForm({...zoneForm, groupId: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <option value="">Танланг</option>
                      {groups.filter(g => g.isActive).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  
                  {/* Viloyatlar - checkbox */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 'bold' }}>🏙️ Вилоятлар *</label>
                      <button type="button" onClick={toggleAllViloyat} style={{ fontSize: '12px', padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {zoneForm.viloyatlar.length === VILOYATLAR.length ? 'Барчасини олиб ташлаш' : 'Барчасини танлаш'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                      {VILOYATLAR.map((v: string) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', background: zoneForm.viloyatlar.includes(v) ? '#667eea20' : 'transparent', borderRadius: '4px' }}>
                          <input type="checkbox" checked={zoneForm.viloyatlar.includes(v)} onChange={() => toggleViloyat(v)} />
                          {v}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Tanlangan: {zoneForm.viloyatlar.length} ta вилоят</div>
                  </div>

                  {/* Tumanlar - checkbox */}
                  {zoneForm.viloyatlar.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontWeight: 'bold' }}>📌 Туман ва Шахарлар</label>
                        <button type="button" onClick={toggleAllTuman} style={{ fontSize: '12px', padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          {zoneForm.tumanlar.length === zoneForm.viloyatlar.reduce((acc: number, v: string) => acc + (TUMANLAR[v]?.length || 0), 0) ? 'Барчасини олиб ташлаш' : 'Барчасини танлаш'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
                        {zoneForm.viloyatlar.map((v: string) => {
                          const tumans = TUMANLAR[v] || [];
                          return tumans.map((t: string) => (
                            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', background: zoneForm.tumanlar.includes(t) ? '#667eea20' : 'transparent', borderRadius: '4px' }}>
                              <input type="checkbox" checked={zoneForm.tumanlar.includes(t)} onChange={() => toggleTuman(t)} />
                              <span>{t}</span>
                              <span style={{ fontSize: '10px', color: '#888' }}>({v})</span>
                            </label>
                          ));
                        })}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        Tanlangan: {zoneForm.tumanlar.length} ta / Жами: {zoneForm.viloyatlar.reduce((acc: number, v: string) => acc + (TUMANLAR[v]?.length || 0), 0)} та
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор</button>
                    <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 2. REGIONS ===== */}
      {tab === 'regions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: '#888' }}>Жами: {regions.length} та</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
              {canManage && (
                <button onClick={() => { resetRegionForm(); setEditingId(null); setModalType('region'); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  ➕ Регион
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {regions.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>📭 Ҳеч қандай регион мавжуд эмас</div>
            ) : (
              regions.map((region: Region) => (
                <div key={region.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4>{region.name}</h4>
                      <div style={{ fontSize: '12px', color: '#888' }}>Код: {region.code}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>📂 {region.groupName || 'Гуруҳсиз'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>📍 Зоналар: {(region.zoneNames || []).join(', ') || 'Йўқ'}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>{region.isActive ? '✅' : '❌'}</div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditRegion(region)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDeleteRegion(region.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Region Modal */}
          {showModal && modalType === 'region' && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setShowModal(false); setEditingId(null); }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h3>{editingId ? '✏️ Регионни таҳрирлаш' : '📍 Янги регион'}</h3>
                <form onSubmit={editingId ? handleUpdateRegion : handleAddRegion}>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Регион номи *</label>
                    <input type="text" value={regionForm.name} onChange={(e) => setRegionForm({...regionForm, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Код: {regionForm.name ? generateCode(regionForm.name) : 'Автоматик'}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Тавсиф</label>
                    <input type="text" value={regionForm.description} onChange={(e) => setRegionForm({...regionForm, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Гуруҳ</label>
                    <select value={regionForm.groupId} onChange={(e) => setRegionForm({...regionForm, groupId: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <option value="">Танланг</option>
                      {groups.filter(g => g.isActive).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>📌 Зоналар *</label>
                    <button type="button" onClick={toggleAllZones} style={{ fontSize: '12px', padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>
                      {regionForm.zoneIds.length === zones.filter(z => z.isActive).length ? 'Барчасини олиб ташлаш' : 'Барчасини танлаш'}
                    </button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginTop: '8px' }}>
                      {zones.length === 0 ? (
                        <div style={{ color: '#999', padding: '10px' }}>📭 Зоналар мавжуд эмас</div>
                      ) : (
                        zones.filter(z => z.isActive).map((zone: Zone) => (
                          <label key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', background: regionForm.zoneIds.includes(zone.id) ? '#667eea20' : 'transparent', borderRadius: '4px' }}>
                            <input type="checkbox" checked={regionForm.zoneIds.includes(zone.id)} onChange={() => toggleZone(zone.id)} />
                            {zone.name}
                          </label>
                        ))
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Tanlangan: {regionForm.zoneIds.length} ta</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор</button>
                    <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 3. DISTRIBUTION ===== */}
      {tab === 'distribution' && (
        <div>
          <h3>📊 Таксимот</h3>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {regions.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>📭 Ҳеч қандай регион мавжуд эмас</div>
            ) : (
              (() => {
                const grouped: Record<string, { regions: string[], zones: string[] }> = {};
                regions.forEach((r: Region) => {
                  const key = r.groupId || 'nogroup';
                  if (!grouped[key]) grouped[key] = { regions: [], zones: [] };
                  if (!grouped[key].regions.includes(r.name)) grouped[key].regions.push(r.name);
                  (r.zoneNames || []).forEach((z: string) => {
                    if (!grouped[key].zones.includes(z)) grouped[key].zones.push(z);
                  });
                });
                return Object.keys(grouped).map((key: string, i: number) => {
                  const groupName = key === 'nogroup' ? 'Гуруҳсиз' : (groups.find(g => g.id === key)?.name || key);
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #667eea' }}>
                      <h4>📂 {groupName}</h4>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        📍 Регионлар ({grouped[key].regions.length}): {grouped[key].regions.join(', ')}
                      </div>
                      <div style={{ fontSize: '13px', color: '#888' }}>
                        📌 Зоналар: {grouped[key].zones.join(', ')}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      )}

      {/* ===== 4. ASSIGNMENTS ===== */}
      {tab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: '#888' }}>Жами: {assignments.length} та</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
              {canManage && (
                <button onClick={() => { resetAssignmentForm(); setEditingId(null); setModalType('assignment'); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  ➕ Бириктириш
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
            {assignments.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>📭 Ҳеч қандай бириктириш мавжуд эмас</div>
            ) : (
              assignments.map((assignment: Assignment) => (
                <div key={assignment.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4>👤 {assignment.userName || assignment.userEmail}</h4>
                      <div style={{ fontSize: '12px', color: '#666' }}>📍 Регионлар: {(assignment.regionNames || []).join(', ') || 'Йўқ'}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>📌 Зоналар: {(assignment.zoneNames || []).join(', ') || 'Йўқ'}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>{assignment.isActive ? '✅' : '❌'}</div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditAssignment(assignment)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDeleteAssignment(assignment.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Assignment Modal */}
          {showModal && modalType === 'assignment' && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setShowModal(false); setEditingId(null); }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h3>{editingId ? '✏️ Бириктиришни таҳрирлаш' : '👤 Янги бириктириш'}</h3>
                <form onSubmit={editingId ? handleUpdateAssignment : handleAddAssignment}>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Фойдаланувчи *</label>
                    <select value={assignmentForm.userId} onChange={(e) => setAssignmentForm({...assignmentForm, userId: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required>
                      <option value="">Танланг</option>
                      {users.filter(u => u.isActive).map(u => <option key={u.id} value={u.id}>{u.displayName || u.email} ({u.role})</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>📍 Регионлар</label>
                    <button type="button" onClick={toggleAllRegions} style={{ fontSize: '12px', padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>
                      {assignmentForm.regionIds.length === regions.filter(r => r.isActive).length ? 'Барчасини олиб ташлаш' : 'Барчасини танлаш'}
                    </button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginTop: '8px' }}>
                      {regions.length === 0 ? (
                        <div style={{ color: '#999', padding: '10px' }}>📭 Регионлар мавжуд эмас</div>
                      ) : (
                        regions.filter(r => r.isActive).map((region: Region) => (
                          <label key={region.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', background: assignmentForm.regionIds.includes(region.id) ? '#667eea20' : 'transparent', borderRadius: '4px' }}>
                            <input type="checkbox" checked={assignmentForm.regionIds.includes(region.id)} onChange={() => toggleRegionAssignment(region.id)} />
                            {region.name}
                          </label>
                        ))
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Tanlangan: {assignmentForm.regionIds.length} ta</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>📌 Зоналар</label>
                    <button type="button" onClick={toggleAllZonesAssignment} style={{ fontSize: '12px', padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>
                      {assignmentForm.zoneIds.length === zones.filter(z => z.isActive).length ? 'Барчасини олиб ташлаш' : 'Барчасини танлаш'}
                    </button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginTop: '8px' }}>
                      {zones.length === 0 ? (
                        <div style={{ color: '#999', padding: '10px' }}>📭 Зоналар мавжуд эмас</div>
                      ) : (
                        zones.filter(z => z.isActive).map((zone: Zone) => (
                          <label key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', background: assignmentForm.zoneIds.includes(zone.id) ? '#667eea20' : 'transparent', borderRadius: '4px' }}>
                            <input type="checkbox" checked={assignmentForm.zoneIds.includes(zone.id)} onChange={() => toggleZoneAssignment(zone.id)} />
                            {zone.name}
                          </label>
                        ))
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Tanlangan: {assignmentForm.zoneIds.length} ta</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор</button>
                    <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Regions;
