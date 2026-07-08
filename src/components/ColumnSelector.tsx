import React, { useState } from 'react';

interface Column {
  key: string;
  label: string;
  visible: boolean;
}

interface ColumnSelectorProps {
  columns: Column[];
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onToggle,
  onShowAll,
  onHideAll
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getVisibleCount = () => {
    return columns.filter(c => c.visible === true).length;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          background: '#6c5ce7',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        📊 Устунлар
        <span style={{ fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
        <span style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '0 8px',
          fontSize: '11px'
        }}>
          {getVisibleCount()}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: '16px',
          minWidth: '220px',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #eee'
          }}>
            <button
              onClick={onShowAll}
              style={{
                padding: '4px 12px',
                background: '#2ecc71',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✅ Ҳаммаси
            </button>
            <button
              onClick={onHideAll}
              style={{
                padding: '4px 12px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ❌ Ҳеч қайси
            </button>
          </div>

          {columns.map(col => (
            <label
              key={col.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 0',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid #f5f5f5'
              }}
            >
              <input
                type="checkbox"
                checked={col.visible === true}
                onChange={() => onToggle(col.key)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#6c5ce7'
                }}
              />
              <span style={{ color: col.visible === true ? '#333' : '#999' }}>
                {col.label}
              </span>
            </label>
          ))}

          <div style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid #eee',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}>
            {getVisibleCount()} та устун кўринади
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
