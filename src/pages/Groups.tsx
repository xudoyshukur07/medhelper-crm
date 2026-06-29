import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const canManageGroups = user?.role === 'superadmin' || user?.role === 'seo';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    const demoGroups: ProductGroup[] = [
      { 
        id: '1', 
        name: 'Vita', 
        description: 'Витамин ва минерал комплекслари', 
        isActive: true, 
        createdBy: '1', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
      { 
        id: '2', 
        name: 'Forte', 
        description: 'Кучли таъсирли препаратлар', 
        isActive: true, 
        createdBy: '1', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
      { 
        id: '3', 
        name: 'Cardio', 
        description: 'Юрак-қон томир препаратлари', 
        isActive: true, 
        createdBy: '2', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
    ];
    setGroups(demoGroups);
    setLoading(false);
  }, []);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageGroups) {
      alert('Сизда гуруҳ яратиш ҳуқуқи йўқ!');
      return;
    }
    const newGroup: ProductGroup = {
      id: Date.now().toString(),
      ...formData,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setGroups([...groups, newGroup]);
    setShowModal(false);
    setFormData({ name: '', description: '', isActive: true });
  };

  const handleEditGroup = (group: ProductGroup) => {
    if (!canManageGroups) {
      alert('Сизда гуруҳ таҳрирлаш ҳуқуқи йўқ!');
      return;
    }
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      isActive: group.isActive
    });
    setShowModal(true);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setGroups(groups.map(g =>
      g.id === editingId ? { ...g, ...formData, updatedAt: new Date().toISOString() } : g
    ));
    setEditingId(null);
    setShowModal(false);
    setFormData({ name: '', description: '', isActive: true });
  };

  const handleDeleteGroup = (id: string) => {
    if (!canManageGroups) {
      alert('Сизда гуруҳ ўчириш ҳуқуқи йўқ!');
      return;
    }
    if (!confirm('Ушбу гуруҳни ўчирамизми?')) return;
    setGroups(groups.filter(g => g.id !== id));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Юкланмоқда...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>📂 Препарат гуруҳлари ({groups.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', width: '180px' }}
          />
          {canManageGroups && (
            <button
              onClick={() => { setEditingId(null); setFormData({ name: '', description: '', isActive: true }); setShowModal(true); }}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              ➕ Гуруҳ қўшиш
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredGroups.map(group => (
          <div key={group.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{group.name}</h3>
                {group.description && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{group.description}</div>}
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  Ҳолат: {group.isActive ? '✅ Фаол' : '❌ Фаол эмас'}
                </div>
              </div>
              {canManageGroups && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleEditGroup(group)} style={{ padding: '4px 8px', background: '#cce5ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteGroup(group.id)} style={{ padding: '4px 8px', background: '#f8d7da', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Гуруҳни таҳрирлаш' : '📂 Янги гуруҳ қўшиш'}</h3>
            <form onSubmit={editingId ? handleUpdateGroup : handleAddGroup}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Номи *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Тавсиф</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Ҳолат</label>
                <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="true">✅ Фаол</option>
                  <option value="false">❌ Фаол эмас</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ name: '', description: '', isActive: true }); }} style={{ padding: '8px 16px', background: '#e8ecf1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Бекор қилиш</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingId ? 'Янгилаш' : 'Сақлаш'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
