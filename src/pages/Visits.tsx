import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface Visit {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorPhone: string;
  doctorRegion: string;
  doctorDistrict: string;
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
  createdAt: string;
  updatedAt: string;
}

interface Doctor {
  id: string;
  name: string;
  phone: string;
  speciality: string;
  region: string;
  district: string;
  workplace: string;
  category?: 'A' | 'B' | 'C' | 'D' | 'VIP';
  totalInvestment: number;
  totalCommission: number;
  debt: number;
  debtStatus: 'debt' | 'profit' | 'zero';
  isActive: boolean;
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

// Вилоят ва туманлар маълумотлари
const REGIONS_DATA: { [key: string]: string[] } = {
  'Тошкент': ['Чилонзор', 'Яккасарой', 'Миробод', 'Юнусобод', 'Шайхонтоҳур', 'Олмазор', 'Учтепа', 'Бектемир', 'Яшнобод'],
  'Самарқанд': ['Самарқанд ш.', 'Булунғур', 'Жомбой', 'Иштихон', 'Каттақурғон', 'Нарпай', 'Нуробод', 'Оқдарё', 'Пайариқ', 'Пастдарғом', 'Тойлоқ', 'Ургут'],
  'Бухоро': ['Бухоро ш.', 'Вобкент', 'Ғиждувон', 'Жондор', 'Когон', 'Олот', 'Пешку', 'Ромитан', 'Шофиркон', 'Қоровулбозор'],
  'Навоий': ['Навоий ш.', 'Зарафшон', 'Конимех', 'Кизилтепа', 'Навбаҳор', 'Нурота', 'Томди', 'Учқудуқ', 'Хатирчи'],
  'Қашқадарё': ['Қарши ш.', 'Гузар', 'Деҳқонобод', 'Камаши', 'Касон', 'Китоб', 'Миришкор', 'Муборак', 'Нишон', 'Чироқчи', 'Шаҳрисабз', 'Яккабоғ'],
  'Сурхондарё': ['Термиз ш.', 'Ангор', 'Бандўхон', 'Бойсун', 'Денов', 'Жарқурғон', 'Қизириқ', 'Қумқурғон', 'Музработ', 'Олтинсой', 'Сариосиё', 'Узун', 'Шеробод', 'Шўрчи'],
  'Жиззах': ['Жиззах ш.', 'Арнасой', 'Бахмал', 'Галлаорол', 'Дўстлик', 'Заамин', 'Зарбдор', 'Мирзачўл', 'Пахтакор', 'Фориш', 'Шароф Рашидов', 'Янгиобод'],
  'Сирдарё': ['Гулистон ш.', 'Боёвут', 'Меҳнатобод', 'Мирзаобод', 'Оқолтин', 'Сайхунобод', 'Сардоба', 'Сирдарё', 'Ховос', 'Ширин'],
  'Фарғона': ['Фарғона ш.', 'Бешариқ', 'Боғдод', 'Бувайда', 'Данғара', 'Ёзёвон', 'Қўқон ш.', 'Марғилон ш.', 'Олтиариқ', 'Риштан', 'Соҳибобод', 'Тошлоқ', 'Учкуприк', 'Узбекистон', 'Фурқат'],
  'Андижон': ['Андижон ш.', 'Асака', 'Балиқчи', 'Боз', 'Булоқбоши', 'Жалақудуқ', 'Избоскан', 'Қўрғонтепа', 'Марҳамат', 'Олтинкўл', 'Пахтаобод', 'Улуғнор', 'Хожаобод', 'Шаҳрихон'],
  'Наманган': ['Наманган ш.', 'Косонсой', 'Мингбулоқ', 'Наманган', 'Норин', 'Пап', 'Тўрақўрғон', 'Учқўрғон', 'Уйчи', 'Чортоқ', 'Чуст', 'Янгиқўрғон'],
  'Хоразм': ['Урганч ш.', 'Беруний', 'Боғот', 'Гурлан', 'Қўшкўпир', 'Хива ш.', 'Хазарасп', 'Тошовул', 'Тўрткўл', 'Шовот', 'Янгиариқ'],
  'Қорақалпоғистон': ['Нукус ш.', 'Амударё', 'Беруний', 'Бўзатов', 'Қанликўл', 'Қораўзак', 'Кегейли', 'Мўйноқ', 'Нукус', 'Тахиатош', 'Тўрткўл', 'Хўжайли', 'Чимбой', 'Элликқалъа'],
  'Тошкент вилояти': ['Ангрен', 'Бекобод', 'Бустонлиқ', 'Зангиота', 'Қибрай', 'Қуйичирчиқ', 'Оққурғон', 'Оҳангарон', 'Ортачирчиқ', 'Паркент', 'Пискент', 'Тошкент ш.', 'Чиноз', 'Юқоричирчиқ']
};

const DAYS = ['Якшанба', 'Душанба', 'Сешанба', 'Чоршанба', 'Пайшанба', 'Жума', 'Шанба'];

const Visits: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Маршрут: ҳар кун учун бир нечта вилоят ва туманлар
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

  // Маршрутга вилоят қўшиш
  const addRouteRegion = (dayIndex: number) => {
    const newRoutes = [...weekRoutes];
    newRoutes[dayIndex].regions.push({ region: '', districts: [] });
    setWeekRoutes(newRoutes);
  };

  // Маршрутдан вилоят ўчириш
  const removeRouteRegion = (dayIndex: number, regionIndex: number) => {
    const newRoutes = [...weekRoutes];
    newRoutes[dayIndex].regions.splice(regionIndex, 1);
    setWeekRoutes(newRoutes);
  };

  // Вилоят ўзгарганда туманларни янгилаш
  const handleRegionChange = (dayIndex: number, regionIndex: number, region: string) => {
    const newRoutes = [...weekRoutes];
    newRoutes[dayIndex].regions[regionIndex].region = region;
    newRoutes[dayIndex].regions[regionIndex].districts = [];
    setWeekRoutes(newRoutes);
  };

  // Туман қўшиш
  const addDistrict = (dayIndex: number, regionIndex: number, district: string) => {
    const newRoutes = [...weekRoutes];
    if (!newRoutes[dayIndex].regions[regionIndex].districts.includes(district)) {
      newRoutes[dayIndex].regions[regionIndex].districts.push(district);
      setWeekRoutes(newRoutes);
    }
  };

  // Туман ўчириш
  const removeDistrict = (dayIndex: number, regionIndex: number, district: string) => {
    const newRoutes = [...weekRoutes];
    newRoutes[dayIndex].regions[regionIndex].districts = 
      newRoutes[dayIndex].regions[regionIndex].districts.filter(d => d !== district);
    setWeekRoutes(newRoutes);
  };

  // Шаблонларни сақлаш
  useEffect(() => {
    const saved = localStorage.getItem('visit_templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        setSavedTemplates([]);
      }
    }
  }, []);

  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('visit_templates', JSON.stringify(savedTemplates));
    }
  }, [savedTemplates]);

  // AI генерация (фақат Душанба-Жума кунлари)
  const generateAIRecommendations = () => {
    setAIGenerating(true);
    setAIProgress(0);

    const recs: AIRecommendation[] = [];
    const today = new Date();
    const weekStart = getWeekStart(today);
    
    const activeDoctors = doctors.filter(d => d.isActive !== false);
    
    // Фақат Душанба-Жума (1-5 кунлар)
    const workDays = [1, 2, 3, 4, 5];
    
    for (const day of workDays) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      const dateStr = formatDate(date);
      
      // Маршрутдан кун учун вилоят/туманлар олиш
      const route = weekRoutes.find(r => r.day === day);
      const regions = route?.regions || [];
      
      // Барча вилоят/туманлардаги врачлар
      let availableDoctors: Doctor[] = [];
      for (const r of regions) {
        const regionDoctors = activeDoctors.filter(d => 
          d.region === r.region && 
          (r.districts.length === 0 || r.districts.includes(d.district || ''))
        );
        availableDoctors = [...availableDoctors, ...regionDoctors];
      }
      
      // Агар бўлмаса, барча врачлардан олиш
      if (availableDoctors.length === 0) {
        availableDoctors = activeDoctors;
      }
      
      // Ҳар бир кун учун 15 та визит
      for (let i = 0; i < 15; i++) {
        const doctorIndex = i % availableDoctors.length;
        const doctor = availableDoctors[doctorIndex];
        if (!doctor) continue;

        // Категория бўйича визит сони
        let maxVisits = 0;
        if (doctor.category === 'VIP' || doctor.category === 'A') maxVisits = 2;
        else if (doctor.category === 'B') maxVisits = 1;
        else if (doctor.category === 'C' || doctor.category === 'D') {
          // C категория ойлик (фақат 1-ва 3-ҳафта)
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

  // Шаблонни сақлаш
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

    setSavedTemplates([...savedTemplates, newTemplate]);
    setTemplateName('');
    setShowTemplateModal(false);
    alert('Шаблон сақланди!');
  };

  // Шаблонни қўллаш
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

    // Маршрутни қўллаш
    setWeekRoutes(template.routes);

    // Санани ҳисоблаш
    let startDate = new Date();
    if (applyDate) {
      startDate = new Date(applyDate);
    }

    // Агар ойлик бўлса, ойнинг 1-санасидан бошлаш
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
    alert('Шаблон қўлланилди!');
  };

  // Локацияни олиш
  const getLocation = (): Promise<{ lat: number; lng: number; address?: string }> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const response = await fetch(
                'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude
              );
              const data = await response.json();
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                address: data.display_name || 'Маълумот олинмади'
              });
            } catch (e) {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                address: 'Манзил олинмади'
              });
            }
          },
          () => {
            resolve({ lat: 0, lng: 0, address: 'Локация олинмади' });
          }
        );
      } else {
        resolve({ lat: 0, lng: 0, address: 'Геолокация қўллаб-қувватланмайди' });
      }
    });
  };

  // Барча AI тавсияларни қўшиш
  const addAllAIRecommendations = async () => {
    if (aiRecommendations.length === 0) {
      alert('Ҳеч қандай тавсия йўқ!');
      return;
    }

    if (!confirm(aiRecommendations.length + ' та визитни режалаштирамизми?')) return;

    let addedCount = 0;
    const location = await getLocation();

    const newVisits: Visit[] = [];
    const usedDoctorsPerDay: Record<string, Set<string>> = {};

    for (const rec of aiRecommendations) {
      if (!usedDoctorsPerDay[rec.suggestedDate]) {
        usedDoctorsPerDay[rec.suggestedDate] = new Set();
      }
      if (usedDoctorsPerDay[rec.suggestedDate].has(rec.doctorId)) continue;
      usedDoctorsPerDay[rec.suggestedDate].add(rec.doctorId);

      const existing = visits.filter(v => 
        v.doctorId === rec.doctorId && 
        v.visitDate === rec.suggestedDate &&
        v.status === 'planned'
      );
      if (existing.length > 0) continue;

      const newVisit: Visit = {
        id: Date.now().toString() + '_' + addedCount,
        doctorId: rec.doctorId,
        doctorName: rec.doctorName,
        doctorPhone: '',
        doctorRegion: rec.doctorRegion,
        doctorDistrict: rec.doctorDistrict,
        doctorWorkplace: '',
        mpId: user?.id || '',
        projectId: 'proj1',
        visitDate: rec.suggestedDate,
        visitTime: rec.suggestedTime,
        purpose: rec.reason,
        drugs: [],
        status: 'planned',
        location: location,
        locationVerified: location.lat !== 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      newVisits.push(newVisit);
      addedCount++;
    }

    const updatedVisits = [...visits, ...newVisits];
    setVisits(updatedVisits);
    localStorage.setItem('visits', JSON.stringify(updatedVisits));

    alert(addedCount + ' та визит режалаштирилди!');
    setShowAIModal(false);
    window.location.reload();
  };

  // Визитни бошлаш
  const handleStartVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    
    const location = await getLocation();
    const updatedVisits = visits.map(v => 
      v.id === selectedVisitId ? { 
        ...v, 
        status: 'in_progress',
        location: location,
        locationVerified: location.lat !== 0,
        notes: startFormData.notes || v.notes,
        nextVisitNote: startFormData.nextVisitNote || v.nextVisitNote,
        nextVisitDate: startFormData.nextVisitDate || v.nextVisitDate,
        nextVisitTime: startFormData.nextVisitTime || v.nextVisitTime,
        updatedAt: new Date().toISOString()
      } : v
    );
    
    setVisits(updatedVisits);
    localStorage.setItem('visits', JSON.stringify(updatedVisits));
    setShowStartModal(false);
    setSelectedVisitId(null);
    setStartFormData({ notes: '', nextVisitNote: '', nextVisitDate: '', nextVisitTime: '' });
  };

  // Визитни тугатиш
  const handleEndVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    
    const updatedVisits = visits.map(v => 
      v.id === selectedVisitId ? { 
        ...v, 
        status: 'completed',
        result: endFormData.result || v.result,
        notes: endFormData.notes || v.notes,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : v
    );
    
    setVisits(updatedVisits);
    localStorage.setItem('visits', JSON.stringify(updatedVisits));
    setShowEndModal(false);
    setSelectedVisitId(null);
    setEndFormData({ result: '', notes: '' });
  };

  // Экспорт
  const getExportVisits = () => {
    let filtered = visits.filter(v => v.status === 'planned' || v.status === 'completed' || v.status === 'missed');
    
    if (exportPeriod === 'week' && exportWeek) {
      const [year, week] = exportWeek.split('-W').map(Number);
      const start = new Date(year, 0, 1 + (week - 1) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      filtered = filtered.filter(v => {
        const d = new Date(v.visitDate);
        return d >= start && d <= end;
      });
    } else if (exportPeriod === 'month' && exportMonth) {
      const [year, month] = exportMonth.split('-').map(Number);
      filtered = filtered.filter(v => {
        const d = new Date(v.visitDate);
        return d.getFullYear() === year && d.getMonth() === month - 1;
      });
    } else if (exportPeriod === 'custom' && customStartDate && customEndDate) {
      filtered = filtered.filter(v => {
        return v.visitDate >= customStartDate && v.visitDate <= customEndDate;
      });
    }
    
    return filtered;
  };

  const handleExport = () => {
    const data = getExportVisits().map((v, index) => ({
      '№': index + 1,
      'Врач': v.doctorName,
      'Телефон': v.doctorPhone,
      'Вилоят': v.doctorRegion,
      'Туман': v.doctorDistrict,
      'Иш жойи': v.doctorWorkplace || '-',
      'Сана': v.visitDate,
      'Вақт': v.visitTime,
      'Мақсад': v.purpose,
      'Препаратлар': v.drugs.length > 0 ? v.drugs.join(', ') : '-',
      'Ҳолат': v.status === 'planned' ? 'Режаланган' : v.status === 'completed' ? 'Бажарилган' : 'Бажарилмаган',
      'Локация': v.location?.address || '-',
      'Координата': v.location?.lat && v.location?.lng ? v.location.lat + ', ' + v.location.lng : '-',
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

  useEffect(() => {
    const demoDoctors: Doctor[] = [
      { id: '1', name: 'Алимов Али', phone: '+998901234567', speciality: 'Терапевт', region: 'Тошкент', district: 'Чилонзор', workplace: '1-поликлиника', category: 'VIP', totalInvestment: 5000000, totalCommission: 8000000, debt: -3000000, debtStatus: 'profit', isActive: true },
      { id: '2', name: 'Тангриберганова Дилдора', phone: '+998902345678', speciality: 'Кардиолог', region: 'Тошкент', district: 'Яккасарой', workplace: '2-поликлиника', category: 'A', totalInvestment: 3000000, totalCommission: 5000000, debt: -2000000, debtStatus: 'profit', isActive: true },
      { id: '3', name: 'Ибрагимов Гани', phone: '+998903456789', speciality: 'Невропотолог', region: 'Тошкент', district: 'Миробод', workplace: '3-поликлиника', category: 'B', totalInvestment: 4000000, totalCommission: 3000000, debt: 1000000, debtStatus: 'debt', isActive: true },
      { id: '4', name: 'Холматов Аброр', phone: '+998904567890', speciality: 'Хирург', region: 'Самарқанд', district: 'Самарқанд ш.', workplace: 'Вилоят шифохонаси', category: 'C', totalInvestment: 6000000, totalCommission: 2000000, debt: 4000000, debtStatus: 'debt', isActive: true },
      { id: '5', name: 'Каримова Нигора', phone: '+998905678901', speciality: 'Педиатр', region: 'Самарқанд', district: 'Булунғур', workplace: 'Болалар шифохонаси', category: 'A', totalInvestment: 4000000, totalCommission: 7000000, debt: -3000000, debtStatus: 'profit', isActive: true },
    ];
    setDoctors(demoDoctors);

    const savedVisits = localStorage.getItem('visits');
    if (savedVisits) {
      try {
        setVisits(JSON.parse(savedVisits));
      } catch (e) {
        setVisits([]);
      }
    } else {
      setVisits([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (visits.length > 0) {
      localStorage.setItem('visits', JSON.stringify(visits));
    }
  }, [visits]);

  const getFilteredVisits = () => {
    let filtered = visits.filter(v => 
      v.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.doctorRegion.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.doctorId || !formData.visitDate || !formData.visitTime || !formData.purpose) {
      alert('Врач, сана, вақт ва мақсад мажбурий!');
      return;
    }

    const location = await getLocation();

    const newVisit: Visit = {
      id: Date.now().toString(),
      ...formData,
      status: 'planned',
      location: location,
      locationVerified: location.lat !== 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedVisits = [...visits, newVisit];
    setVisits(updatedVisits);
    localStorage.setItem('visits', JSON.stringify(updatedVisits));
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Ушбу визитни ўчирамизми?')) return;
    const updatedVisits = visits.filter(v => v.id !== id);
    setVisits(updatedVisits);
    localStorage.setItem('visits', JSON.stringify(updatedVisits));
  };

  useEffect(() => {
    const now = new Date();
    const today = formatDate(now);
    let updated = false;
    
    const newVisits = visits.map(v => {
      if (v.visitDate < today && (v.status === 'planned' || v.status === 'in_progress')) {
        updated = true;
        return { ...v, status: 'missed', updatedAt: new Date().toISOString() };
      }
      return v;
    });
    
    if (updated) {
      setVisits(newVisits);
      localStorage.setItem('visits', JSON.stringify(newVisits));
    }
  }, [visits]);

  const resetForm = () => {
    setFormData({
      doctorId: '', doctorName: '', doctorPhone: '', doctorRegion: '', doctorDistrict: '',
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

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      'VIP': { bg: '#ffd700', color: '#8B7500' },
      'A': { bg: '#d4edda', color: '#155724' },
      'B': { bg: '#cce5ff', color: '#004085' },
      'C': { bg: '#fff3cd', color: '#856404' },
      'D': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = colors[category] || colors['C'];
    return <span style={{ padding: '2px 8px', borderRadius: '4px', background: style.bg, color: style.color, fontSize: '11px', fontWeight: 'bold' }}>{category}</span>;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Бошқарув панели */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>📅 Ташрифлар ({visits.length})</h2>
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
          <button
            onClick={() => setShowRouteModal(true)}
            style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            🗺️ Маршрут
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{ padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📋 Шаблонлар
          </button>
          <button
            onClick={() => { 
              setShowAIModal(true); 
              generateAIRecommendations();
            }}
            style={{ padding: '8px 16px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            🤖 AI режалаш
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📤 Экспорт
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ➕ Визит қўшиш
          </button>
        </div>
      </div>

      {/* Маршрут модал */}
      {showRouteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowRouteModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>🗺️ Ҳафталик маршрут</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Ҳар бир кун учун бир нечта вилоят ва туманларни белгиланг</p>
            <p style={{ color: '#888', fontSize: '12px' }}>⚠️ Фақат Душанба-Жума кунлари ишлайди</p>
            {weekRoutes.map((route, dayIndex) => {
              const dayName = DAYS[route.day];
              return (
                <div key={dayIndex} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{dayName}</div>
                  {route.regions.map((regionData, regionIndex) => (
                    <div key={regionIndex} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          value={regionData.region} 
                          onChange={(e) => handleRegionChange(dayIndex, regionIndex, e.target.value)}
                          style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                          <option value="">Вилоят танланг</option>
                          {Object.keys(REGIONS_DATA).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => removeRouteRegion(dayIndex, regionIndex)}
                          style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >✕</button>
                      </div>
                      {regionData.region && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '10px' }}>
                          {(REGIONS_DATA[regionData.region] || []).map(district => (
                            <button
                              key={district}
                              onClick={() => {
                                if (regionData.districts.includes(district)) {
                                  removeDistrict(dayIndex, regionIndex, district);
                                } else {
                                  addDistrict(dayIndex, regionIndex, district);
                                }
                              }}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: regionData.districts.includes(district) ? '2px solid #667eea' : '1px solid #ddd',
                                background: regionData.districts.includes(district) ? '#667eea20' : 'white',
                                cursor: 'pointer'
                              }}
                            >
                              {district} {regionData.districts.includes(district) && '✓'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => addRouteRegion(dayIndex)}
                    style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >➕ Вилоят қўшиш</button>
                </div>
              );
            })}
            <button onClick={() => setShowRouteModal(false)} style={{ marginTop: '10px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Сақлаш</button>
          </div>
        </div>
      )}

      {/* Шаблонлар модал */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowTemplateModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📋 Шаблонлар</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input 
                type="text" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Шаблон номи"
                style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <select 
                value={templateType} 
                onChange={(e) => setTemplateType(e.target.value as 'weekly' | 'monthly')}
                style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
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
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {t.type === 'weekly' ? 'Ҳафталик' : 'Ойлик'} | 
                      {t.type === 'weekly' ? t.weekStart : t.monthStart} | 
                      {t.visits.length} та визит
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => {
                      setApplyTemplateId(t.id);
                      setApplyPeriod(t.type === 'weekly' ? 'week' : 'month');
                      setShowApplyTemplateModal(true);
                    }} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 Қўллаш</button>
                    <button onClick={() => {
                      setSavedTemplates(savedTemplates.filter(st => st.id !== t.id));
                      localStorage.setItem('visit_templates', JSON.stringify(savedTemplates.filter(st => st.id !== t.id)));
                    }} style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => setShowTemplateModal(false)} style={{ marginTop: '10px', padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Ёпиш</button>
          </div>
        </div>
      )}

      {/* Шаблонни қўллаш модал */}
      {showApplyTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowApplyTemplateModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📥 Шаблонни қўллаш</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Қайси давр учун қўллашни танланг:</p>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Давр тури</label>
              <select 
                value={applyPeriod} 
                onChange={(e) => setApplyPeriod(e.target.value as 'week' | 'month')}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="week">Ҳафталик</option>
                <option value="month">Ойлик</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                {applyPeriod === 'week' ? 'Ҳафта санаси' : 'Ой санаси'}
              </label>
              <input 
                type={applyPeriod === 'week' ? 'week' : 'month'} 
                value={applyDate} 
                onChange={(e) => setApplyDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0 }}>🤖 AI режалаш</h3>
              <span style={{ fontSize: '12px', color: '#888' }}>{aiRecommendations.length} та визит</span>
            </div>
            <p style={{ color: '#666', fontSize: '14px' }}>
              VIP ва A: ҳафтада 2 марта | B: ҳафтада 1 марта | C: ойда 2 марта
            </p>
            <p style={{ color: '#888', fontSize: '12px' }}>⚠️ Фақат Душанба-Жума кунлари режалаштирилади</p>
            
            {aiGenerating && (
              <div style={{ margin: '10px 0' }}>
                <div style={{ background: '#e8ecf1', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                  <div style={{ background: '#667eea', height: '100%', width: aiProgress + '%', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{aiProgress}%</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => addAllAIRecommendations()}
                style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📋 Барчасини режалаш
              </button>
              <button 
                onClick={() => { generateAIRecommendations(); }}
                style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                🔄 Қайта генерация
              </button>
            </div>

            {aiRecommendations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Ҳеч қандай тавсия йўқ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {aiRecommendations.map((rec, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: rec.priority === 'high' ? '#f0f8ff' : rec.priority === 'medium' ? '#fafafa' : '#f5f5f5',
                    borderRadius: '8px',
                    borderLeft: rec.priority === 'high' ? '4px solid #2ecc71' : rec.priority === 'medium' ? '4px solid #f39c12' : '4px solid #e74c3c'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{rec.doctorName}</div>
                      <div style={{ fontSize: '12px', color: '#555' }}>{rec.suggestedDate} {rec.suggestedTime}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{rec.reason}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        {getCategoryBadge(rec.category)}
                        <span style={{ fontSize: '11px', color: rec.profit >= 0 ? '#2ecc71' : '#e74c3c' }}>
                          {rec.profit >= 0 ? '+ ' : '- '} {Math.abs(rec.profit).toLocaleString()} сўм
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const doctor = doctors.find(d => d.id === rec.doctorId);
                        if (doctor) {
                          setFormData({
                            doctorId: doctor.id,
                            doctorName: doctor.name,
                            doctorPhone: doctor.phone,
                            doctorRegion: doctor.region || '',
                            doctorDistrict: doctor.district || '',
                            doctorWorkplace: doctor.workplace || '',
                            mpId: user?.id || '',
                            projectId: 'proj1',
                            visitDate: rec.suggestedDate,
                            visitTime: rec.suggestedTime,
                            purpose: rec.reason,
                            drugs: []
                          });
                          setSelectedAIRecommendation(rec);
                          setShowAIModal(false);
                          setShowModal(true);
                        }
                      }}
                      style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ➕ Қўшиш
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAIModal(false)} style={{ marginTop: '15px', padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Ёпиш</button>
          </div>
        </div>
      )}

      {/* Экспорт модал */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowExportModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📤 Ҳисоботни экспорт қилиш</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Қайси давр учун ҳисобот олишни танланг:</p>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Давр тури</label>
              <select 
                value={exportPeriod} 
                onChange={(e) => setExportPeriod(e.target.value as 'week' | 'month' | 'custom')}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="week">Ҳафталик</option>
                <option value="month">Ойлик</option>
                <option value="custom">Танлаб</option>
              </select>
            </div>
            {exportPeriod === 'week' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳафтани танланг</label>
                <input 
                  type="week" 
                  value={exportWeek} 
                  onChange={(e) => setExportWeek(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            )}
            {exportPeriod === 'month' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ойни танланг</label>
                <input 
                  type="month" 
                  value={exportMonth} 
                  onChange={(e) => setExportMonth(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            )}
            {exportPeriod === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Бошланиш</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тугаш</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowExportModal(false)} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📥 Экспорт</button>
            </div>
          </div>
        </div>
      )}

      {/* Ҳафталик календарь */}
      {viewMode === 'week' && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          <div style={{ background: '#f8f9fa', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>◀</button>
              <span style={{ fontWeight: 'bold' }}>
                {getWeekStart(currentDate).toLocaleDateString()} - {getWeekEnd(currentDate).toLocaleDateString()}
              </span>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} style={{ padding: '4px 12px', background: '#e8ecf1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>▶</button>
            </div>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Бугун</button>
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
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Бугун</button>
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

      {/* Кунлик/Танлаб кўриниш */}
      {(viewMode === 'day' || viewMode === 'custom') && (
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

      {/* Визит қўшиш модал */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>➕ Янги визит режалаш</h3>
            {selectedAIRecommendation && (
              <div style={{ background: '#f0f0ff', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
                🤖 AI тавсияси: {selectedAIRecommendation.reason}
              </div>
            )}
            <form onSubmit={handleAddVisit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Врач *</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => {
                    const doctor = doctors.find(d => d.id === e.target.value);
                    if (doctor) {
                      setFormData({ ...formData, doctorId: doctor.id, doctorName: doctor.name, doctorPhone: doctor.phone, doctorRegion: doctor.region, doctorDistrict: doctor.district, doctorWorkplace: doctor.workplace || '' });
                    }
                  }}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Танланг</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.category || 'C'}) - {d.region}, {d.district}</option>)}
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {purposeTemplates.map(p => (
                    <button key={p} type="button" onClick={() => setFormData({...formData, purpose: p})} style={{ padding: '4px 10px', background: formData.purpose === p ? '#667eea' : '#e8ecf1', color: formData.purpose === p ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>{p}</button>
                  ))}
                </div>
                <input type="text" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} placeholder="Ёки ўзингиз ёзинг..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Препаратлар (макс 3 та)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {drugOptions.map(d => (
                    <button key={d} type="button" onClick={() => {
                      if (formData.drugs.includes(d)) {
                        setFormData({...formData, drugs: formData.drugs.filter(x => x !== d)});
                      } else if (formData.drugs.length < 3) {
                        setFormData({...formData, drugs: [...formData.drugs, d]});
                      } else {
                        alert('Максимум 3 та препарат танлаш мумкин!');
                      }
                    }} style={{ padding: '4px 10px', background: formData.drugs.includes(d) ? '#667eea' : '#e8ecf1', color: formData.drugs.includes(d) ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>{d} {formData.drugs.includes(d) && '✓'}</button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Танланган: {formData.drugs.length > 0 ? formData.drugs.join(', ') : 'Ҳеч қандай препарат танланмаган'}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); setSelectedAIRecommendation(null); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
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
            <p style={{ color: '#888', fontSize: '13px' }}>📍 Локация автоматик равишда юкланади</p>
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
    </div>
  );
};

export default Visits;
