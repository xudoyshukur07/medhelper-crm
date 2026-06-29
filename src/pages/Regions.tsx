import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Вилоят ва туман маълумотлари
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

interface Region {
  id: string;
  name: string;
  code: string;
  description?: string;
  regionName: string;
  isActive: boolean;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  description?: string;
  regionName: string;
  isActive: boolean;
}

const Regions: React.FC = () => {
  const { user } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('regions');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'region' | 'zone'>('region');
  
  // Регион формаси
  const [regionForm, setRegionForm] = useState({
    name: '',
    code: '',
    description: '',
    regionName: '',
    isActive: true
  });

  // Зона формаси
  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    description: '',
    regionName: '',
    isActive: true
  });

  const canManage = user?.role === 'superadmin' || user?.role === 'seo';

  // ===== LOCALSTORAGE'ДАН МАЪЛУМОТЛАРНИ ЮКЛАШ =====
  const loadData = () => {
    try {
      const savedRegions = localStorage.getItem('medhelper_regions');
      const savedZones = localStorage.getItem('medhelper_zones');
      
      if (savedRegions) {
        setRegions(JSON.parse(savedRegions));
      } else {
        // Бошланғич маълумотлар
        const demoRegions = Object.keys(REGIONS_DATA).map((name, index) => ({
          id: String(index + 1),
          name: name,
          code: name.substring(0, 3).toUpperCase(),
          description: name + ' вилояти',
          regionName: name,
          isActive: true
        }));
        setRegions(demoRegions);
        localStorage.setItem('medhelper_regions', JSON.stringify(demoRegions));
      }

      if (savedZones) {
        setZones(JSON.parse(savedZones));
      } else {
        const demoZones: Zone[] = [];
        Object.keys(REGIONS_DATA).forEach(regionName => {
          REGIONS_DATA[regionName].forEach(district => {
            demoZones.push({
              id: 'z' + (demoZones.length + 1),
              name: district,
              code: district.substring(0, 3).toUpperCase(),
              description: district + ' тумани',
              regionName: regionName,
              isActive: true
            });
          });
        });
        setZones(demoZones);
        localStorage.setItem('medhelper_zones', JSON.stringify(demoZones));
      }
    } catch (error) {
      console.error('Маълумотларни юклашда хатолик:', error);
    }
    setLoading(false);
  };

  // ===== LOCALSTORAGE'ГА МАЪЛУМОТЛАРНИ САҚЛАШ =====
  const saveData = (newRegions: Region[], newZones: Zone[]) => {
    try {
      localStorage.setItem('medhelper_regions', JSON.stringify(newRegions));
      localStorage.setItem('medhelper_zones', JSON.stringify(newZones));
    } catch (error) {
      console.error('Маълумотларни сақлашда хатолик:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Регион қўшиш
  const handleAddRegion = () => {
    if (!regionForm.name || !regionForm.code || !regionForm.regionName) {
      alert('Барча мажбурий майдонларни тўлдиринг!');
      return;
    }

    const newRegion: Region = {
      id: Date.now().toString(),
      name: regionForm.name,
      code: regionForm.code,
      description: regionForm.description || '',
      regionName: regionForm.regionName,
      isActive: regionForm.isActive
    };

    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    saveData(updatedRegions, zones);
    setShowModal(false);
    setRegionForm({ name: '', code: '', description: '', regionName: '', isActive: true });
    alert('Регион сақланди!');
  };

  // Зона қўшиш
  const handleAddZone = () => {
    if (!zoneForm.name || !zoneForm.code || !zoneForm.regionName) {
      alert('Барча мажбурий майдонларни тўлдиринг!');
      return;
    }

    const newZone: Zone = {
      id: Date.now().toString(),
      name: zoneForm.name,
      code: zoneForm.code,
      description: zoneForm.description || '',
      regionName: zoneForm.regionName,
      isActive: zoneForm.isActive
    };

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    saveData(regions, updatedZones);
    setShowModal(false);
    setZoneForm({ name: '', code: '', description: '', regionName: '', isActive: true });
    alert('Зона сақланди!');
  };

  // Регионни ўчириш
  const handleDeleteRegion = (id: string) => {
    if (!confirm('Ушбу регионни ўчирамизми?')) return;
    const updatedRegions = regions.filter(r => r.id !== id);
    setRegions(updatedRegions);
    saveData(updatedRegions, zones);
  };

  // Зонани ўчириш
  const handleDeleteZone = (id: string) => {
    if (!confirm('Ушбу зонани ўчирамизми?')) return;
    const updatedZones = zones.filter(z => z.id !== id);
    setZones(updatedZones);
    saveData(regions, updatedZones);
  };

  // Регионга тегишли зоналарни олиш
  const getZonesByRegion = (regionName: string) => {
    return zones.filter(z => z.regionName === regionName);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🗺️ Регион ва зоналар</h2>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setModalType('region'); setShowModal(true); }}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              ➕ Регион
            </button>
            <button
              onClick={() => { setModalType('zone'); setShowModal(true); }}
              style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              ➕ Зона
            </button>
          </div>
        )}
      </div>

      {/* Таблар */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e8ecf1' }}>
        <button 
          onClick={() => setActiveTab('regions')} 
          style={{ 
            padding: '10px 20px', 
            background: activeTab === 'regions' ? '#667eea' : 'transparent', 
            color: activeTab === 'regions' ? 'white' : '#333', 
            border: 'none', 
            borderRadius: '8px 8px 0 0', 
            cursor: 'pointer',
            fontWeight: activeTab === 'regions' ? 'bold' : 'normal'
          }}
        >
          📍 Регионлар ({regions.length})
        </button>
        <button 
          onClick={() => setActiveTab('zones')} 
          style={{ 
            padding: '10px 20px', 
            background: activeTab === 'zones' ? '#667eea' : 'transparent', 
            color: activeTab === 'zones' ? 'white' : '#333', 
            border: 'none', 
            borderRadius: '8px 8px 0 0', 
            cursor: 'pointer',
            fontWeight: activeTab === 'zones' ? 'bold' : 'normal'
          }}
        >
          📌 Зоналар ({zones.length})
        </button>
      </div>

      {/* РЕГИОНЛАР */}
      {activeTab === 'regions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {regions.map(region => (
            <div key={region.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>{region.name}</h4>
                  <div style={{ fontSize: '13px', color: '#888' }}>Код: {region.code}</div>
                  {region.description && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{region.description}</div>}
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    📍 {region.regionName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    🏙️ Зоналар: {getZonesByRegion(region.regionName).length} та
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => handleDeleteRegion(region.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ЗОНАЛАР */}
      {activeTab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {zones.map(zone => (
            <div key={zone.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>{zone.name}</h4>
                  <div style={{ fontSize: '13px', color: '#888' }}>Код: {zone.code}</div>
                  <div style={{ fontSize: '13px', color: '#667eea' }}>📍 {zone.regionName}</div>
                  {zone.description && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{zone.description}</div>}
                </div>
                {canManage && (
                  <button onClick={() => handleDeleteZone(zone.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛ ОЙНА */}
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
              maxWidth: '500px', 
              width: '90%' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {modalType === 'region' ? '📍 Янги регион' : '📌 Янги зона'}
            </h3>

            {modalType === 'region' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddRegion(); }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label>
                  <input 
                    type="text" 
                    value={regionForm.name} 
                    onChange={(e) => setRegionForm({...regionForm, name: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Код *</label>
                  <input 
                    type="text" 
                    value={regionForm.code} 
                    onChange={(e) => setRegionForm({...regionForm, code: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Вилоят *</label>
                  <select
                    value={regionForm.regionName}
                    onChange={(e) => setRegionForm({...regionForm, regionName: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  >
                    <option value="">Танланг</option>
                    {Object.keys(REGIONS_DATA).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тавсиф</label>
                  <input 
                    type="text" 
                    value={regionForm.description} 
                    onChange={(e) => setRegionForm({...regionForm, description: e.target.value})} 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                  <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Сақлаш</button>
                </div>
              </form>
            )}

            {modalType === 'zone' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddZone(); }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label>
                  <input 
                    type="text" 
                    value={zoneForm.name} 
                    onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Код *</label>
                  <input 
                    type="text" 
                    value={zoneForm.code} 
                    onChange={(e) => setZoneForm({...zoneForm, code: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Вилоят *</label>
                  <select
                    value={zoneForm.regionName}
                    onChange={(e) => setZoneForm({...zoneForm, regionName: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                  >
                    <option value="">Танланг</option>
                    {Object.keys(REGIONS_DATA).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тавсиф</label>
                  <input 
                    type="text" 
                    value={zoneForm.description} 
                    onChange={(e) => setZoneForm({...zoneForm, description: e.target.value})} 
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                  <button type="submit" style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Сақлаш</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Regions;
