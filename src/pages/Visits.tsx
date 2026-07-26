import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { REGIONS_DATA, SPECIALITIES } from '../utils/regions';
import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore';

interface Visit {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorPhone: string;
  doctorRegion: string;
  doctorDistrict: string;
  doctorDistrictId?: string;
  doctorWorkplace?: string;
  mpId: string;
  projectId: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  drugs: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'missed';
  location?: { lat: number; lng: number; address?: string };
  locationVerified?: boolean;
  notes?: string;
  nextVisitNote?: string;
  nextVisitDate?: string;
  nextVisitTime?: string;
  result?: string;
  completedAt?: string;
  createdAt: any;
  updatedAt: any;
  userId?: string;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  speciality: string;
  region: string;
  district: string;
  districtId?: string;
  workplace: string;
  category?: 'A' | 'B' | 'C' | 'D' | 'VIP';
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
  isActive: boolean;
}

interface User {
  uid: string;
  email: string;
  name: string;
  role: string;
  subordinates?: string[];
  districts?: any[];
  districtId?: string;
  districtIds?: string[];
}

interface AIRecommendation {
  doctorId: string;
  doctorName: string;
  doctorRegion: string;
  doctorDistrict: string;
  suggestedDate: string;
  suggestedTime: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'A' | 'B' | 'C' | 'D' | 'VIP';
  profit: number;
}

interface DayRoute {
  day: number;
  regions: { region: string; districts: string[] }[];
}

interface WeekSchedule {
  id: string;
  name: string;
  type: 'weekly' | 'monthly';
  weekStart: string;
  monthStart?: string;
  routes: DayRoute[];
  visits: AIRecommendation[];
  createdAt: string;
}

const DAYS = ['Якшанба', 'Душанба', 'Сешанба', 'Чоршанба', 'Пайшанба', 'Жума', 'Шанба'];

const defaultRoutes: DayRoute[] = [
  { day: 1, regions: [{ region: '', districts: [] }] },
  { day: 2, regions: [{ region: '', districts: [] }] },
  { day: 3, regions: [{ region: '', districts: [] }] },
  { day: 4, regions: [{ region: '', districts: [] }] },
  { day: 5, regions: [{ region: '', districts: [] }] },
];

// ============================================================
// YORDAMCHI FUNKSIYA: District ID larni olish
// ============================================================
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

const Visits: React.FC = () => {
  const { user, refreshUser } = useAuth(); // ✅ refreshUser qo'shildi
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedAIRecommendation, setSelectedAIRecommendation] = useState<AIRecommendation | null>(null);
  const [aiGenerating, setAIGenerating] = useState(false);
  const [aiProgress, setAIProgress] = useState(0);
  const [exportPeriod, setExportPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [exportWeek, setExportWeek] = useState('');
  const [exportMonth, setExportMonth] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<WeekSchedule[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [applyPeriod, setApplyPeriod] = useState<'week' | 'month'>('week');
  const [applyDate, setApplyDate] = useState('');

  // ===== MP LAR RO'YXATI (Manager uchun) =====
  const [mpList, setMpList] = useState<User[]>([]);
  const [selectedMpId, setSelectedMpId] = useState<string>('');

  // Маршрут
  const [weekRoutes, setWeekRoutes] = useState<DayRoute[]>([
    { day: 1, regions: [{ region: 'Тошкент', districts: ['Чилонзор', 'Яккасарой'] }] },
    { day: 2, regions: [{ region: 'Тошкент', districts: ['Миробод', 'Юнусобод'] }] },
    { day: 3, regions: [{ region: 'Самарқанд', districts: ['Самарқанд ш.'] }] },
    { day: 4, regions: [{ region: 'Самарқанд', districts: ['Булунғур'] }] },
    { day: 5, regions: [{ region: 'Тошкент', districts: ['Шайхонтоҳур'] }] },
  ]);

  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    doctorPhone: '',
    doctorRegion: '',
    doctorDistrict: '',
    doctorDistrictId: '',
    doctorWorkplace: '',
    mpId: '',
    projectId: '',
    visitDate: '',
    visitTime: '',
    purpose: '',
    drugs: [] as string[]
  });

  const [startFormData, setStartFormData] = useState({
    notes: '',
    nextVisitNote: '',
    nextVisitDate: '',
    nextVisitTime: ''
  });

  const [endFormData, setEndFormData] = useState({
    result: '',
    notes: ''
  });

  const purposeTemplates = [
    'Янги препарат тақдимоти',
    'Препарат самарадорлигини текшириш',
    'Шифокор билан музокара',
    'Рецепт ёзиб бериш',
    'Клиник текширув натижаларини кўриш',
    'Пациент ҳолатини кузатиш',
    'Дори воситаларини етказиб бериш',
    'Тиббий кенгашма',
    'Профилактик текширув'
  ];

  const drugOptions = [
    'Амаредетрим',
    'Ферсикард',
    'Долмасто',
    'Репродуктол',
    'Кардио-препарат',
    'Нейро-препарат',
    'Гастро-препарат',
    'Гормонал препарат'
  ];

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekEnd = (date: Date): Date => {
    const d = getWeekStart(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const getDayName = (date: Date): string => {
    return DAYS[date.getDay()];
  };

  // ============ KUN O'TISH FUNKSIYALARI ============
  
  const goToPreviousDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ============ FIREBASE YORDAMCHI FUNKSIYALARI ============
  
  const saveRoutesToFirebase = async (routes: typeof weekRoutes) => {
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          visits: {
            routes: routes
          }
        }, { merge: true });
      } catch (error) {
        console.error('Marshrut saqlashda xatolik:', error);
      }
    }
  };

  const loadRoutesFromFirebase = async () => {
    if (user?.uid) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.visits?.routes) {
            return data.visits.routes;
          }
        }
      } catch (error) {
        console.error('Marshrut yuklashda xatolik:', error);
      }
    }
    return null;
  };

  const saveTemplatesToFirebase = async (templates: typeof savedTemplates) => {
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          visits: {
            templates: templates
          }
        }, { merge: true });
      } catch (error) {
        console.error('Shablon saqlashda xatolik:', error);
      }
    }
  };

  const loadTemplatesFromFirebase = async () => {
    if (user?.uid) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.visits?.templates) {
            return data.visits.templates;
          }
        }
      } catch (error) {
        console.error('Shablon yuklashda xatolik:', error);
      }
    }
    return null;
  };

  const clearRoutesFromFirebase = async () => {
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          visits: {
            routes: []
          }
        }, { merge: true });
      } catch (error) {
        console.error('Marshrut o\'chirishda xatolik:', error);
      }
    }
  };

  // ============ MARSHRUT FUNKSIYALARI ============
  
  const saveRoute = () => {
    try {
      saveRoutesToFirebase(weekRoutes);
      setShowRouteModal(false);
      alert('✅ Маршрут сақланди!');
    } catch (error) {
      console.error('Сақлашда хатолик:', error);
      alert('❌ Маршрутни сақлашда хатолик!');
    }
  };

  const loadRoute = async () => {
    try {
      const saved = await loadRoutesFromFirebase();
      if (saved && saved.length > 0) {
        setWeekRoutes(saved);
        console.log('✅ Маршрут юкланди:', saved);
      }
    } catch (error) {
      console.error('Юклашда хатолик:', error);
    }
  };

  const addRouteDay = () => {
    const newDay = weekRoutes.length + 1;
    if (newDay > 7) {
      alert('Максимум 7 кун!');
      return;
    }
    setWeekRoutes([...weekRoutes, { day: newDay, regions: [{ region: '', districts: [] }] }]);
  };

  const removeRouteDay = (dayIndex: number) => {
    if (weekRoutes.length <= 1) {
      alert('Камida 1 кун бўлиши керак!');
      return;
    }
    const newRoutes = [...weekRoutes];
    newRoutes.splice(dayIndex, 1);
    setWeekRoutes(newRoutes);
  };

  useEffect(() => {
    loadRoute();
  }, []);

  // ============ SHABLON FUNKSIYALARI ============
  
  const saveTemplate = () => {
    if (!templateName.trim()) {
      alert('Шаблон номини киритинг!');
      return;
    }

    const newTemplate: WeekSchedule = {
      id: Date.now().toString(),
      name: templateName,
      type: templateType,
      weekStart: formatDate(getWeekStart(new Date())),
      monthStart: templateType === 'monthly' ? formatDate(new Date()) : undefined,
      routes: JSON.parse(JSON.stringify(weekRoutes)),
      visits: [...aiRecommendations],
      createdAt: new Date().toISOString()
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    saveTemplatesToFirebase(updated);
    setTemplateName('');
    setShowTemplateModal(false);
    alert('✅ Шаблон сақланди! (' + newTemplate.visits.length + ' та визит)');
  };

  const deleteTemplate = (id: string) => {
    if (!confirm('Шаблонни ўчирамизми?')) return;
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    saveTemplatesToFirebase(updated);
    alert('✅ Шаблон ўчирилди!');
  };

  const applyTemplate = () => {
    if (!applyTemplateId) {
      alert('Шаблонни танланг!');
      return;
    }

    const template = savedTemplates.find(t => t.id === applyTemplateId);
    if (!template) {
      alert('Шаблон топилмади!');
      return;
    }

    setWeekRoutes(template.routes);

    let startDate = new Date();
    if (applyDate) {
      startDate = new Date(applyDate);
    }

    if (applyPeriod === 'month') {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const weekStart = getWeekStart(startDate);
    const workDays = [1, 2, 3, 4, 5];

    const updatedVisits = template.visits.map((rec, index) => {
      const dayOffset = index % 5;
      const date = new Date(weekStart);
      date.setDate(date.getDate() + workDays[dayOffset % workDays.length]);
      return {
        ...rec,
        suggestedDate: formatDate(date)
      };
    });

    setAIRecommendations(updatedVisits);
    setShowApplyTemplateModal(false);
    alert('✅ Шаблон қўлланилди! (' + updatedVisits.length + ' та визит)');
  };

  const loadTemplates = async () => {
    try {
      const saved = await loadTemplatesFromFirebase();
      if (saved) {
        setSavedTemplates(saved);
      }
    } catch (error) {
      console.error('Шаблонларни юклашда хатолик:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // ============ MP LARNI YUKLASH (Manager uchun) - TUZATILGAN ============
  useEffect(() => {
    // ✅ User ma'lumotlarini yangilash
    refreshUser();
    
    if (user?.role === 'rm' || user?.role === 'ffm') {
      const subordinates = user.subordinates || [];
      console.log('👥 Subordinates (yangilangan):', subordinates);
      
      if (subordinates.length > 0) {
        // Barcha MP larni yuklab, filtrlaymiz (chunki where('uid', 'in', subordinates) ishlamaydi)
        const mpQuery = query(
          collection(db, 'users'),
          where('role', '==', 'mp')
        );
        
        const unsubscribe = onSnapshot(mpQuery, (snapshot) => {
          const allMps = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as User));
          
          // Faqat subordinates dagi MP larni olish
          const filteredMps = allMps.filter(mp => 
            subordinates.includes(mp.uid)
          );
          
          setMpList(filteredMps);
          console.log('✅ MP lar yuklandi:', filteredMps.length, 'ta');
        });
        
        return () => unsubscribe();
      } else {
        setMpList([]);
        console.log('⚠️ Hech qanday MP biriktirilmagan');
      }
    }
  }, [user, refreshUser]); // ✅ refreshUser qo'shildi

  // ============ DOCTORLARNI YUKLASH ============

  const loadDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'doctors'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Doctor));
      console.log('✅ Врачлар юкланди:', data.length, 'та');
      setDoctors(data);
    } catch (err) {
      console.error('Doctorlarni yuklashда xatolik:', err);
      setError('Врачларни юклашда хатолик');
    }
  };

  // ============ FIREBASE LISTENER ============

  useEffect(() => {
    const q = query(collection(db, 'visits'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Visit));
      setVisits(data);
      setLoading(false);
    }, (error) => {
      console.error('Listener xatosi:', error);
      setError('Ma\'lumotlarni yuklashда xatolik');
      setLoading(false);
    });

    loadDoctors();

    return () => unsubscribe();
  }, []);

  // ============ TASHRIF QO'SHISH ============

  const canAddVisit = user?.role === 'mp';

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.doctorId || !formData.visitDate || !formData.visitTime || !formData.purpose) {
      setError('Врач, сана, вақт ва мақсад мажбурий!');
      return;
    }

    const selectedDoctor = doctors.find(d => d.id === formData.doctorId);

    try {
      await addDoc(collection(db, 'visits'), {
        ...formData,
        doctorDistrictId: selectedDoctor?.districtId || '',
        status: 'planned',
        userId: auth.currentUser?.uid || 'anonymous',
        mpId: user?.uid || '',
        mpName: user?.name || '',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSuccess('✅ Визит қўшилди!');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ушбу визитни ўчирамизми?')) return;
    try {
      await deleteDoc(doc(db, 'visits', id));
      setSuccess('✅ Визит ўчирилди!');
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleStartVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'visits', selectedVisitId), {
        status: 'in_progress',
        notes: startFormData.notes,
        nextVisitNote: startFormData.nextVisitNote,
        nextVisitDate: startFormData.nextVisitDate,
        nextVisitTime: startFormData.nextVisitTime,
        updatedAt: serverTimestamp()
      });
      setSuccess('✅ Визит бошланди!');
      setShowStartModal(false);
      setSelectedVisitId(null);
      setStartFormData({ notes: '', nextVisitNote: '', nextVisitDate: '', nextVisitTime: '' });
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  const handleEndVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'visits', selectedVisitId), {
        status: 'completed',
        result: endFormData.result,
        notes: endFormData.notes,
        completedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
      setSuccess('✅ Визит тугатилди!');
      setShowEndModal(false);
      setSelectedVisitId(null);
      setEndFormData({ result: '', notes: '' });
    } catch (err: any) {
      setError('Xatolik: ' + err.message);
    }
  };

  // ============ AI FUNKSIYALARI ============
  
  const generateAIRecommendations = () => {
    setAIGenerating(true);
    setAIProgress(0);

    const recs: AIRecommendation[] = [];
    const today = new Date();
    const weekStart = getWeekStart(today);
    const activeDoctors = doctors.filter(d => d.isActive !== false);
    const workDays = [1, 2, 3, 4, 5];

    for (const day of workDays) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      const dateStr = formatDate(date);

      const route = weekRoutes.find(r => r.day === day);
      const regions = route?.regions || [];

      let availableDoctors: Doctor[] = [];
      for (const r of regions) {
        const regionDoctors = activeDoctors.filter(d =>
          d.region === r.region &&
          (r.districts.length === 0 || r.districts.includes(d.district || ''))
        );
        availableDoctors = [...availableDoctors, ...regionDoctors];
      }

      if (availableDoctors.length === 0) {
        availableDoctors = activeDoctors;
      }

      for (let i = 0; i < 15; i++) {
        const doctorIndex = i % availableDoctors.length;
        const doctor = availableDoctors[doctorIndex];
        if (!doctor) continue;

        let maxVisits = 0;
        if (doctor.category === 'VIP' || doctor.category === 'A') maxVisits = 2;
        else if (doctor.category === 'B') maxVisits = 1;
        else if (doctor.category === 'C' || doctor.category === 'D') {
          const weekOfMonth = Math.ceil((date.getDate()) / 7);
          if (weekOfMonth !== 1 && weekOfMonth !== 3) continue;
          maxVisits = 1;
        }

        const weeklyCount = recs.filter(r => r.doctorId === doctor.id).length;
        if (weeklyCount >= maxVisits) continue;

        const hour = 9 + Math.floor((i * 0.6 + day * 0.3) % 9);
        const minute = (i * 9 + day * 5) % 60;
        const timeStr = String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.floor(minute)).padStart(2, '0');

        let priority: 'high' | 'medium' | 'low' = 'medium';
        let profit = doctor.totalCommission - doctor.totalInvestment;
        let reason = '';

        if (doctor.category === 'VIP' || doctor.category === 'A') {
          priority = 'high';
          reason = (doctor.category === 'VIP' ? 'VIP' : 'A') + ' категорияли врач билан музокара';
        } else if (doctor.category === 'B' && profit > 0) {
          priority = 'high';
          reason = 'B категорияли врач билан ишлаш';
        } else if (doctor.category === 'C') {
          priority = 'medium';
          reason = 'C категорияли врач фаоллигини ошириш (ойлик)';
        } else {
          priority = 'low';
          reason = 'D категорияли врач ҳолатини текшириш (ойлик)';
        }

        recs.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorRegion: doctor.region || 'Аниқланмаган',
          doctorDistrict: doctor.district || 'Аниқланмаган',
          suggestedDate: dateStr,
          suggestedTime: timeStr,
          reason: reason,
          priority: priority,
          category: doctor.category || 'C',
          profit: profit || 0
        });
      }

      setAIProgress(Math.round(((day) / 5) * 100));
    }

    setAIRecommendations(recs);
    setAIGenerating(false);
    setAIProgress(100);
  };

  const addAllAIRecommendations = async () => {
    if (aiRecommendations.length === 0) {
      alert('Ҳеч қандай тавсия йўқ!');
      return;
    }

    if (!confirm(aiRecommendations.length + ' та визитни режалаштирамизми?')) return;

    let addedCount = 0;
    for (const rec of aiRecommendations) {
      try {
        const doctor = doctors.find(d => d.id === rec.doctorId);
        
        await addDoc(collection(db, 'visits'), {
          doctorId: rec.doctorId,
          doctorName: rec.doctorName,
          doctorPhone: '',
          doctorRegion: rec.doctorRegion,
          doctorDistrict: rec.doctorDistrict,
          doctorDistrictId: doctor?.districtId || '',
          doctorWorkplace: '',
          mpId: user?.id || '',
          projectId: 'proj1',
          visitDate: rec.suggestedDate,
          visitTime: rec.suggestedTime,
          purpose: rec.reason,
          drugs: [],
          status: 'planned',
          userId: auth.currentUser?.uid || 'anonymous',
          userEmail: auth.currentUser?.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addedCount++;
      } catch (error) {
        console.error('Визит қўшишда хатолик:', error);
      }
    }

    alert(addedCount + ' та визит режалаштирилди!');
    setShowAIModal(false);
  };

  // ============================================================
  // VRACHLAR FILTR (TUZATILGAN)
  // ============================================================

  const getAvailableDoctors = () => {
    let available = doctors;
    
    if (!user) return available;

    const userRole = user.role;
    const userDistricts = user.districts || [];
    const userDistrictId = user.districtId;
    const userDistrictIds = user.districtIds || [];

    console.log('🔍 === VRACHLAR FILTR (TUZATILGAN) ===');
    console.log('👤 User role:', userRole);
    console.log('📍 userDistricts (RAW):', userDistricts);
    console.log('📍 userDistrictId:', userDistrictId);
    console.log('📍 userDistrictIds:', userDistrictIds);
    console.log('📋 Barcha vrachlar:', doctors.length);

    // Faqat MP, RM, FFM uchun filtr
    if (['mp', 'rm', 'ffm'].includes(userRole)) {
      // ===== DISTRICT ID LARNI YIG'ISH =====
      let targetDistrictIds: string[] = [];

      // 1. userDistricts dan olish (obyekt yoki string)
      if (userDistricts && userDistricts.length > 0) {
        const extracted = extractDistrictIds(userDistricts);
        targetDistrictIds = [...targetDistrictIds, ...extracted];
      }

      // 2. userDistrictId dan olish (MP uchun)
      if (userDistrictId && !targetDistrictIds.includes(userDistrictId)) {
        targetDistrictIds.push(userDistrictId);
      }

      // 3. userDistrictIds dan olish (array)
      if (userDistrictIds && userDistrictIds.length > 0) {
        userDistrictIds.forEach((id: string) => {
          if (!targetDistrictIds.includes(id)) {
            targetDistrictIds.push(id);
          }
        });
      }

      console.log('🎯 Target district IDs:', targetDistrictIds);

      // ===== FILTR =====
      if (targetDistrictIds.length > 0) {
        available = available.filter((doc: Doctor) => {
          const docDistrictId = doc.districtId || doc.district || '';
          const match = targetDistrictIds.some((td: string) => {
            // To'liq moslik
            if (td === docDistrictId || td === doc.district || td === doc.districtId) {
              return true;
            }
            // Qisman moslik (agar ID lar bir-birini ichiga olsa)
            if (docDistrictId.includes(td) || td.includes(docDistrictId)) {
              return true;
            }
            return false;
          });
          
          if (!match) {
            console.log(`❌ Filtrdan o'tdi: ${doc.name} (districtId: ${doc.districtId}, district: ${doc.district})`);
          }
          return match;
        });
        console.log(`✅ ${userRole} filtr: ${available.length} ta vrach qoldi`);
      } else {
        console.log('⚠️ District ID lar topilmadi! Barcha vrachlar ko\'rinadi.');
      }
    }
    // Admin rollar - barcha vrachlar
    else {
      console.log('✅ Admin barcha vrachlarni ko\'radi:', available.length);
    }
    
    return available;
  };

  const availableDoctors = getAvailableDoctors();

  // ============================================================
  // TASHRIFLAR FILTR (TUZATILGAN)
  // ============================================================

  const getFilteredVisits = () => {
    let filtered = visits;

    // 1. Qidiruv bo'yicha filtr
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.doctorName?.toLowerCase().includes(term) ||
        v.purpose?.toLowerCase().includes(term) ||
        v.doctorRegion?.toLowerCase().includes(term)
      );
    }

    // 2. Rol bo'yicha filtr
    if (user) {
      const userRole = user.role;
      const userId = user.uid;
      const subordinates = user.subordinates || [];

      console.log('🔍 === TASHRIFLAR FILTR ===');
      console.log('👤 User role:', userRole);
      console.log('👥 Subordinates:', subordinates);
      console.log('📋 Tanlangan MP:', selectedMpId);

      if (userRole === 'mp') {
        // MP faqat o'z tashriflari
        filtered = filtered.filter(v => v.userId === userId || v.mpId === userId);
        console.log('✅ MP filtr: faqat o\'z tashriflari,', filtered.length, 'ta');
      } 
      else if (userRole === 'rm' || userRole === 'ffm') {
        // Manager o'z MP larining tashriflari
        let targetMpIds: string[] = [];
        
        if (selectedMpId) {
          // Tanlangan MP
          targetMpIds = [selectedMpId];
          console.log('🎯 Tanlangan MP:', selectedMpId);
        } else if (subordinates.length > 0) {
          // Barcha o'z MP larining tashriflari
          targetMpIds = subordinates;
          console.log('🎯 Barcha MP lar:', targetMpIds);
        }

        if (targetMpIds.length > 0) {
          filtered = filtered.filter(v => {
            const match = targetMpIds.includes(v.userId || '') || targetMpIds.includes(v.mpId || '');
            if (!match) {
              console.log(`❌ Filtrdan o'tdi: ${v.doctorName} (userId: ${v.userId}, mpId: ${v.mpId})`);
            }
            return match;
          });
          console.log(`✅ ${userRole.toUpperCase()} filtr: ${filtered.length} ta tashrif qoldi`);
        } else {
          // Hech qanday MP yo'q - o'z tashriflarini ko'rsat
          filtered = filtered.filter(v => v.userId === userId || v.mpId === userId);
          console.log(`⚠️ ${userRole.toUpperCase()} ga biriktirilgan MP lar yo'q, o'z tashriflari: ${filtered.length} ta`);
        }
      }
      // Admin rollar - barcha tashriflar
      else {
        console.log('✅ Admin barcha tashriflarni ko\'radi:', filtered.length);
      }
    }

    // 3. Vaqt bo'yicha filtr
    if (viewMode === 'day') {
      const today = formatDate(currentDate);
      filtered = filtered.filter(v => v.visitDate === today);
    } else if (viewMode === 'week') {
      const start = getWeekStart(currentDate);
      const end = getWeekEnd(currentDate);
      filtered = filtered.filter(v => {
        const d = new Date(v.visitDate);
        return d >= start && d <= end;
      });
    } else if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      filtered = filtered.filter(v => {
        const d = new Date(v.visitDate);
        return d >= start && d <= end;
      });
    } else if (viewMode === 'custom' && customStartDate && customEndDate) {
      filtered = filtered.filter(v => {
        return v.visitDate >= customStartDate && v.visitDate <= customEndDate;
      });
    }

    return filtered.sort((a, b) => {
      if (a.visitDate !== b.visitDate) {
        return a.visitDate.localeCompare(b.visitDate);
      }
      return a.visitTime.localeCompare(b.visitTime);
    });
  };

  const filteredVisits = getFilteredVisits();

  // ============ YORDAMCHI FUNKSIYALAR ============

  const resetForm = () => {
    setFormData({
      doctorId: '', doctorName: '', doctorPhone: '', doctorRegion: '', doctorDistrict: '', doctorDistrictId: '',
      doctorWorkplace: '', mpId: '', projectId: '', visitDate: '', visitTime: '', purpose: '', drugs: []
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; bg: string }> = {
      planned: { color: '#3498db', label: '📅 Режаланган', bg: '#cce5ff' },
      in_progress: { color: '#f39c12', label: '🔄 Давом этмоқда', bg: '#fff3cd' },
      completed: { color: '#2ecc71', label: '✅ Бажарилган', bg: '#d4edda' },
      missed: { color: '#e74c3c', label: '❌ Бажарилмаган', bg: '#f8d7da' }
    };
    const badge = badges[status] || badges.planned;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', background: badge.bg, color: badge.color, fontSize: '12px', fontWeight: 'bold' }}>{badge.label}</span>;
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // ============ EKSPORT ============

  const handleExport = () => {
    const data = filteredVisits.map((v, index) => ({
      '№': index + 1,
      'Врач': v.doctorName,
      'Телефон': v.doctorPhone,
      'Вилоят': v.doctorRegion,
      'Туман': v.doctorDistrict,
      'Сана': v.visitDate,
      'Вақт': v.visitTime,
      'Мақсад': v.purpose,
      'Ҳолат': v.status === 'planned' ? 'Режаланган' : v.status === 'completed' ? 'Бажарилган' : 'Бажарилмаган',
      'Натижа': v.result || '-',
      'Изоҳ': v.notes || '-'
    }));

    if (data.length === 0) {
      alert('Танланган давр учун визитлар топилмади!');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Ташрифлар');
    XLSX.writeFile(wb, 'ташрифлар_' + new Date().toISOString().split('T')[0] + '.xlsx');
    setShowExportModal(false);
  };

  // ============ RENDER ============

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ background: '#fee', color: '#c33', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div style={{ background: '#efe', color: '#3c3', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>📅 Ташрифлар ({filteredVisits.length})</h2>
          
          {user?.role === 'mp' && (
            <span style={{ fontSize: '13px', color: '#888', background: '#e8ecf1', padding: '4px 12px', borderRadius: '12px' }}>
              👤 Ўз ташрифларим
            </span>
          )}
          {(user?.role === 'rm' || user?.role === 'ffm') && (
            <span style={{ fontSize: '13px', color: '#888', background: '#e8ecf1', padding: '4px 12px', borderRadius: '12px' }}>
              👥 {user.subordinates?.length || 0} та MP
            </span>
          )}
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => { setViewMode('day'); }} style={{ padding: '4px 12px', background: viewMode === 'day' ? '#667eea' : '#e8ecf1', color: viewMode === 'day' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📅 Кун</button>
            <button onClick={() => { setViewMode('week'); }} style={{ padding: '4px 12px', background: viewMode === 'week' ? '#667eea' : '#e8ecf1', color: viewMode === 'week' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📊 Ҳафта</button>
            <button onClick={() => { setViewMode('month'); }} style={{ padding: '4px 12px', background: viewMode === 'month' ? '#667eea' : '#e8ecf1', color: viewMode === 'month' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📆 Ой</button>
            <button onClick={() => { setViewMode('custom'); }} style={{ padding: '4px 12px', background: viewMode === 'custom' ? '#667eea' : '#e8ecf1', color: viewMode === 'custom' ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📅 Танлаб</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {viewMode === 'custom' && (
            <>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
              <span>→</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
            </>
          )}
          <input
            type="text"
            placeholder="🔍 Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '150px' }}
          />
          
          {/* MP tanlash (Manager uchun) */}
          {(user?.role === 'rm' || user?.role === 'ffm') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#555' }}>👤 MP:</label>
              <select
                value={selectedMpId}
                onChange={(e) => setSelectedMpId(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="">📋 Барча MP лар ({mpList.length})</option>
                {mpList.map(mp => (
                  <option key={mp.uid} value={mp.uid}>
                    {mp.name} ({mp.email})
                  </option>
                ))}
              </select>
              {mpList.length === 0 && (
                <span style={{ fontSize: '12px', color: '#f39c12' }}>
                  ⚠️ Ҳеч қандай MP бириктирилмаган
                </span>
              )}
            </div>
          )}

          <button onClick={() => setShowRouteModal(true)} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗺️ Маршрут</button>
          <button onClick={() => setShowTemplateModal(true)} style={{ padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Шаблонлар</button>
          <button onClick={() => { setShowAIModal(true); generateAIRecommendations(); }} style={{ padding: '8px 16px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🤖 AI режалаш</button>
          <button onClick={() => setShowExportModal(true)} style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📤 Экспорт</button>
          
          {/* Tashrif qo'shish - faqat MP uchun */}
          {canAddVisit && (
            <button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              ➕ Визит қўшиш
            </button>
          )}
        </div>
      </div>

      {/* Kunlik ko'rinish */}
      {viewMode === 'day' && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          <div style={{ background: '#f8f9fa', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={goToPreviousDay} style={{ padding: '6px 14px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>◀</button>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {currentDate.toLocaleDateString('uz', { day: 'numeric', month: 'long', year: 'numeric' })}
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>({getDayName(currentDate)})</span>
              </span>
              <button onClick={goToNextDay} style={{ padding: '6px 14px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>▶</button>
            </div>
            <button onClick={goToToday} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📅 Бугун</button>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>📋 {filteredVisits.length} та визит</span>
            </div>
            {filteredVisits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>📭 Бу кунга режаланган визитлар йўқ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredVisits.map((visit) => (
                  <div key={visit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{visit.visitTime} - {visit.doctorName}</div>
                      <div style={{ fontSize: '13px', color: '#555' }}>{visit.purpose}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{visit.doctorRegion}, {visit.doctorDistrict}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusBadge(visit.status)}
                      {visit.status === 'planned' && (
                        <>
                          <button onClick={() => { setSelectedVisitId(visit.id); setShowStartModal(true); }} style={{ padding: '4px 12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🚀</button>
                          <button onClick={() => handleDelete(visit.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </>
                      )}
                      {visit.status === 'in_progress' && (
                        <button onClick={() => { setSelectedVisitId(visit.id); setShowEndModal(true); }} style={{ padding: '4px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✅</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ҳафталик календарь */}
      {viewMode === 'week' && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          <div style={{ background: '#f8f9fa', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>◀</button>
              <span style={{ fontWeight: 'bold' }}>{getWeekStart(currentDate).toLocaleDateString()} - {getWeekEnd(currentDate).toLocaleDateString()}</span>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>▶</button>
            </div>
            <button onClick={goToToday} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Бугун</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#f0f0f0' }}>
            {getWeekDays().map((day) => {
              const dateStr = formatDate(day);
              const dayVisits = filteredVisits.filter(v => v.visitDate === dateStr);
              const isToday = dateStr === formatDate(new Date());
              const isWorkDay = day.getDay() >= 1 && day.getDay() <= 5;

              return (
                <div key={dateStr} style={{
                  background: isWorkDay ? 'white' : '#f5f5f5',
                  padding: '10px',
                  minHeight: '150px',
                  border: isToday ? '2px solid #667eea' : 'none',
                  opacity: isWorkDay ? 1 : 0.5
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: isToday ? '#667eea' : '#333', marginBottom: '6px' }}>
                    {getDayName(day)}<br/>
                    <span style={{ fontSize: '11px', color: '#888' }}>{dateStr}</span>
                    <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>({dayVisits.length})</span>
                    {!isWorkDay && <span style={{ fontSize: '10px', color: '#e74c3c', marginLeft: '4px' }}>🚫</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dayVisits.slice(0, 5).map((v) => (
                      <div key={v.id} style={{ fontSize: '11px', padding: '2px 6px', background: '#f8f9fa', borderRadius: '3px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{v.visitTime} {v.doctorName}</span>
                        <span>{getStatusBadge(v.status)}</span>
                      </div>
                    ))}
                    {dayVisits.length > 5 && <div style={{ fontSize: '10px', color: '#888', textAlign: 'center' }}>+ {dayVisits.length - 5} та</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ойлик календарь */}
      {viewMode === 'month' && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          <div style={{ background: '#f8f9fa', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>◀</button>
              <span style={{ fontWeight: 'bold' }}>{currentDate.toLocaleString('uz', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>▶</button>
            </div>
            <button onClick={goToToday} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Бугун</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#f0f0f0' }}>
            {['Душ', 'Сеш', 'Чор', 'Пай', 'Жум', 'Шан', 'Якш'].map(day => (
              <div key={day} style={{ background: '#f8f9fa', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>{day}</div>
            ))}
            {Array.from({ length: 42 }, (_, i) => {
              const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const dayOfWeek = start.getDay();
              const date = new Date(start);
              date.setDate(date.getDate() - dayOfWeek + i);
              const dateStr = formatDate(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayVisits = filteredVisits.filter(v => v.visitDate === dateStr);
              const isToday = dateStr === formatDate(new Date());
              const isWorkDay = date.getDay() >= 1 && date.getDay() <= 5;

              return (
                <div key={i} style={{
                  background: isCurrentMonth && isWorkDay ? 'white' : isCurrentMonth ? '#f5f5f5' : '#f0f0f0',
                  padding: '6px',
                  minHeight: '70px',
                  border: isToday ? '2px solid #667eea' : 'none',
                  opacity: isCurrentMonth ? (isWorkDay ? 1 : 0.6) : 0.4
                }}>
                  <div style={{ fontSize: '12px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#667eea' : '#333' }}>
                    {date.getDate()}
                    <span style={{ fontSize: '10px', color: '#888', marginLeft: '4px' }}>({dayVisits.length})</span>
                    {!isWorkDay && <span style={{ fontSize: '10px', color: '#e74c3c', marginLeft: '4px' }}>🚫</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayVisits.slice(0, 2).map((v) => (
                      <div key={v.id} style={{ fontSize: '9px', padding: '1px 4px', background: '#f8f9fa', borderRadius: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.visitTime} {v.doctorName}
                      </div>
                    ))}
                    {dayVisits.length > 2 && <div style={{ fontSize: '8px', color: '#888' }}>+{dayVisits.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom/List view */}
      {(viewMode === 'custom') && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>№</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Врач</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Вилоят/Туман</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Сана/Вақт</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Мақсад</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳолат</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px' }}>Ҳаракатлар</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ҳеч қандай визит топилмади</td></tr>
                ) : (
                  filteredVisits.map((visit, index) => (
                    <tr key={visit.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 14px' }}>{index + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{visit.doctorName}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px' }}>{visit.doctorRegion}, {visit.doctorDistrict}</td>
                      <td style={{ padding: '10px 14px' }}>{visit.visitDate} {visit.visitTime}</td>
                      <td style={{ padding: '10px 14px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{visit.purpose}</td>
                      <td style={{ padding: '10px 14px' }}>{getStatusBadge(visit.status)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {visit.status === 'planned' && (
                          <>
                            <button onClick={() => { setSelectedVisitId(visit.id); setShowStartModal(true); }} style={{ padding: '4px 12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>🚀 Бошлаш</button>
                            <button onClick={() => handleDelete(visit.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                          </>
                        )}
                        {visit.status === 'in_progress' && (
                          <button onClick={() => { setSelectedVisitId(visit.id); setShowEndModal(true); }} style={{ padding: '4px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✅ Тугатиш</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== MODALLAR ====== */}

      {/* Маршрут модал */}
      {showRouteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowRouteModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>🗺️ Ҳафталик маршрут</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Ҳар бир кун учун вилоят ва туманларни белгиланг</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button onClick={addRouteDay} style={{ padding: '4px 12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕ Кун қўшиш</button>
              <button onClick={() => {
                if (confirm('Маршрутни тозаламоқчимисиз?')) {
                  clearRoutesFromFirebase();
                  setWeekRoutes(defaultRoutes);
                  alert('✅ Маршрут тозalandi!');
                }
              }} style={{ padding: '4px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Тозалаш</button>
            </div>

            {weekRoutes.map((route, dayIndex) => (
              <div key={dayIndex} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{DAYS[route.day] || 'Кун ' + route.day}</div>
                  <button onClick={() => removeRouteDay(dayIndex)} style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
                {route.regions.map((regionData, regionIndex) => (
                  <div key={regionIndex} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      {regionData.region || 'Танланмаган'}
                      {regionData.districts.length > 0 && ` (${regionData.districts.join(', ')})`}
                    </span>
                    <button onClick={() => {
                      const newRoutes = [...weekRoutes];
                      newRoutes[dayIndex].regions.splice(regionIndex, 1);
                      setWeekRoutes(newRoutes);
                    }} style={{ padding: '2px 6px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => {
                  const newRoutes = [...weekRoutes];
                  newRoutes[dayIndex].regions.push({ region: '', districts: [] });
                  setWeekRoutes(newRoutes);
                }} style={{ padding: '4px 10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>➕ Вилоят қўшиш</button>
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={() => setShowRouteModal(false)} style={{ flex: 1, padding: '10px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ёпиш</button>
              <button onClick={saveRoute} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Сақлаш</button>
            </div>
          </div>
        </div>
      )}

      {/* Шаблонлар модал */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowTemplateModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>📋 Шаблонлар</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input type="text" placeholder="Шаблон номи" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value as 'weekly' | 'monthly')} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <option value="weekly">Ҳафталик</option>
                <option value="monthly">Ойлик</option>
              </select>
              <button onClick={saveTemplate} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Сақлаш</button>
            </div>
            {savedTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Ҳеч қандай шаблон йўқ</div>
            ) : (
              savedTemplates.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{t.type === 'weekly' ? 'Ҳафталик' : 'Ойлик'} | {t.visits.length} та визит</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setApplyTemplateId(t.id); setShowApplyTemplateModal(true); }} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 Қўллаш</button>
                    <button onClick={() => deleteTemplate(t.id)} style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => setShowTemplateModal(false)} style={{ padding: '10px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%', marginTop: '10px' }}>Ёпиш</button>
          </div>
        </div>
      )}

      {/* Шаблонни қўллаш модал */}
      {showApplyTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowApplyTemplateModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3>📥 Шаблонни қўллаш</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Давр тури</label>
              <select value={applyPeriod} onChange={(e) => setApplyPeriod(e.target.value as 'week' | 'month')} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <option value="week">Ҳафталик</option>
                <option value="month">Ойлик</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>{applyPeriod === 'week' ? 'Ҳафта санаси' : 'Ой санаси'}</label>
              <input type={applyPeriod === 'week' ? 'week' : 'month'} value={applyDate} onChange={(e) => setApplyDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowApplyTemplateModal(false)} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
              <button onClick={applyTemplate} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📥 Қўллаш</button>
            </div>
          </div>
        </div>
      )}

      {/* AI модал */}
      {showAIModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowAIModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>🤖 AI режалаш</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>VIP va A: ҳафтада 2 марта | B: ҳафтада 1 марта | C: ойда 2 марта</p>
            {aiGenerating && (
              <div style={{ margin: '10px 0' }}>
                <div style={{ background: '#e8ecf1', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                  <div style={{ background: '#667eea', height: '100%', width: aiProgress + '%', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{aiProgress}%</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button onClick={() => { generateAIRecommendations(); }} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 Қайта генерация</button>
              <button onClick={addAllAIRecommendations} style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Барчасини режалаш</button>
              <button onClick={() => setShowAIModal(false)} style={{ padding: '10px 20px', background: '#e8ecf1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Ёпиш</button>
            </div>
            {aiRecommendations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Ҳеч қандай тавсия йўқ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {aiRecommendations.slice(0, 20).map((rec, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8f9fa', borderRadius: '8px', borderLeft: rec.priority === 'high' ? '4px solid #2ecc71' : '4px solid #f39c12' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{rec.doctorName}</div>
                      <div style={{ fontSize: '12px', color: '#555' }}>{rec.suggestedDate} {rec.suggestedTime} - {rec.reason}</div>
                    </div>
                    <button onClick={() => {
                      const doctor = availableDoctors.find(d => d.id === rec.doctorId);
                      if (doctor) {
                        setFormData({
                          doctorId: doctor.id,
                          doctorName: doctor.name,
                          doctorPhone: doctor.phone,
                          doctorRegion: doctor.region || '',
                          doctorDistrict: doctor.district || '',
                          doctorDistrictId: doctor.districtId || '',
                          doctorWorkplace: doctor.workplace || '',
                          mpId: user?.id || '',
                          projectId: 'proj1',
                          visitDate: rec.suggestedDate,
                          visitTime: rec.suggestedTime,
                          purpose: rec.reason,
                          drugs: []
                        });
                        setShowAIModal(false);
                        setShowModal(true);
                      }
                    }} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Визит қўшиш модал */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>➕ Янги визит режалаш</h3>
            <form onSubmit={handleAddVisit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Врач *</label>
                <select 
                  value={formData.doctorId} 
                  onChange={(e) => {
                    const doctor = availableDoctors.find(d => d.id === e.target.value);
                    if (doctor) {
                      setFormData({ 
                        ...formData, 
                        doctorId: doctor.id, 
                        doctorName: doctor.name, 
                        doctorPhone: doctor.phone, 
                        doctorRegion: doctor.region, 
                        doctorDistrict: doctor.district,
                        doctorDistrictId: doctor.districtId || '',
                        doctorWorkplace: doctor.workplace || '' 
                      });
                    }
                  }} 
                  required 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Врач танланг</option>
                  {availableDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.region}, {d.district})
                      {d.category ? ' - ' + d.category : ''}
                    </option>
                  ))}
                  {availableDoctors.length === 0 && (
                    <option value="" disabled>⚠️ Districtga tegishli vrachlar yo\'q</option>
                  )}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Сана *</label>
                  <input type="date" value={formData.visitDate} onChange={(e) => setFormData({...formData, visitDate: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Вақт *</label>
                  <input type="time" value={formData.visitTime} onChange={(e) => setFormData({...formData, visitTime: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Визит мақсади *</label>
                <input type="text" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Сақлаш</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Визитни бошлаш модал */}
      {showStartModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowStartModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>🚀 Визитни бошлаш</h3>
            <form onSubmit={handleStartVisit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Визит ҳақида изоҳ</label>
                <input type="text" value={startFormData.notes} onChange={(e) => setStartFormData({...startFormData, notes: e.target.value})} placeholder="Визит давомидаги маълумотлар" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Кейинги визит учун эслатма</label>
                <input type="text" value={startFormData.nextVisitNote} onChange={(e) => setStartFormData({...startFormData, nextVisitNote: e.target.value})} placeholder="Кейинги визитда эслатиш керак бўлган маълумот" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Кейинги визит санаси</label>
                  <input type="date" value={startFormData.nextVisitDate} onChange={(e) => setStartFormData({...startFormData, nextVisitDate: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Кейинги визит вақти</label>
                  <input type="time" value={startFormData.nextVisitTime} onChange={(e) => setStartFormData({...startFormData, nextVisitTime: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowStartModal(false); setSelectedVisitId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🚀 Бошлаш</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Визитни тугатиш модал */}
      {showEndModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowEndModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>✅ Визитни тугатиш</h3>
            <form onSubmit={handleEndVisit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Визит натижаси *</label>
                <input type="text" value={endFormData.result} onChange={(e) => setEndFormData({...endFormData, result: e.target.value})} placeholder="Визит натижасини киритинг" required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Қўшимча изоҳ</label>
                <input type="text" value={endFormData.notes} onChange={(e) => setEndFormData({...endFormData, notes: e.target.value})} placeholder="Қўшимча маълумот" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowEndModal(false); setSelectedVisitId(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✅ Тугатиш</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Экспорт модал */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowExportModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3>📤 Экспорт</h3>
            <button onClick={handleExport} style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', marginTop: '10px' }}>📥 Экспорт қилиш</button>
            <button onClick={() => setShowExportModal(false)} style={{ padding: '10px 20px', background: '#e8ecf1', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', marginTop: '10px' }}>Ёпиш</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visits;