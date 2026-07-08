import React from 'react'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>📋 Elektron Shablon</h1>
      <p>Bu elektron shablon web ilovasi</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '40px' }}>📊</div>
          <div style={{ fontWeight: 'bold' }}>Dashboard</div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '40px' }}>📋</div>
          <div style={{ fontWeight: 'bold' }}>Shablonlar</div>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '40px' }}>⚙️</div>
          <div style={{ fontWeight: 'bold' }}>Sozlamalar</div>
        </div>
      </div>
    </div>
  )
}

export default App
