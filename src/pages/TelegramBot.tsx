import { useState } from 'react';

const TelegramBot: React.FC = () => {
  const [messageText, setMessageText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const handleSendMessage = async () => {
    if (!messageText) {
      alert('Хабар матнини киритинг!');
      return;
    }
    setLoading(true);
    try {
      // Демо режим - фақат консольга чиқариш
      console.log('📨 Хабар юборилди:', messageText);
      console.log('👤 Олувчи:', recipientId || 'Гуруҳ');
      
      setMessages([
        {
          id: Date.now().toString(),
          text: messageText,
          sentAt: new Date().toISOString(),
          status: 'sent',
          recipient: recipientId || 'Гуруҳ'
        },
        ...messages
      ]);
      setMessageText('');
      alert('✅ Хабар юборилди (Демо режим)!');
    } catch (error) {
      alert('❌ Хабар юборишда хатолик!');
    }
    setLoading(false);
  };

  const handleSendReminder = (type: string) => {
    const reminders = {
      visit: '📅 Визит эслатмаси юборилди!',
      payment: '💰 Тўлов эслатмаси юборилди!',
      debt: '🔴 Қарз эслатмаси юборилди!'
    };
    alert('✅ ' + (reminders[type as keyof typeof reminders] || 'Эслатма юборилди!'));
    console.log('⏰ Эслатма юборилди:', type);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>🤖 Telegram Бот</h2>
      <p style={{ color: '#666' }}>Telegram орқали хабарлар ва эслатмалар юбориш (Демо режим)</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
        {/* Хабар юбориш */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px' }}>📤 Хабар юбориш</h4>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Recipient ID (ёки буш қолдиринг)"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Хабар матни..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {loading ? 'Юборилмоқда...' : 'Юбориш'}
            </button>
          </div>
        </div>

        {/* Эслатма юбориш */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px' }}>⏰ Эслатма юбориш</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSendReminder('visit')}
              style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              📅 Визит
            </button>
            <button
              onClick={() => handleSendReminder('payment')}
              style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              💰 Тўлов
            </button>
            <button
              onClick={() => handleSendReminder('debt')}
              style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              🔴 Қарз
            </button>
          </div>
        </div>
      </div>

      {/* Юборилган хабарлар */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginTop: '16px' }}>
        <h4 style={{ margin: '0 0 12px' }}>📋 Юборилган хабарлар ({messages.length})</h4>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Ҳеч қандай хабар юборилмаган</div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{msg.text}</span>
                <span style={{ fontSize: '12px', color: msg.status === 'sent' ? '#2ecc71' : '#e74c3c' }}>
                  {msg.status === 'sent' ? '✅' : '❌'} {msg.recipient}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {new Date(msg.sentAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TelegramBot;
