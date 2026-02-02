import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function ChatCliente() {
  const [nome, setNome] = useState(localStorage.getItem('user_nome') || '');
  const [isEntrato, setIsEntrato] = useState(!!localStorage.getItem('user_nome'));
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_id') || null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      const sub = supabase.channel(`chat_${chatId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
          setChatHistory(prev => [...prev, payload.new]);
        })
        .subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [chatId]);

  async function fetchMessages() {
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    if (data) setChatHistory(data);
  }

  async function handleLogin() {
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) {
      setChatId(data.id);
      localStorage.setItem('chat_id', data.id);
      localStorage.setItem('user_nome', nome);
      setIsEntrato(true);
    }
  }

  async function inviaMessaggio() {
    if (!message.trim()) return;
    await supabase.from('messages').insert([{ chat_id: chatId, content: message, sender: 'client' }]);
    setMessage('');
  }

  if (!isEntrato) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#6200ee', color: 'white' }}>
        <h1>Benvenuta!</h1>
        <input 
          placeholder="Inserisci il tuo nome" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          style={{ padding: '15px', borderRadius: '10px', border: 'none', width: '80%', maxWidth: '300px', marginBottom: '10px' }}
        />
        <button onClick={handleLogin} style={{ padding: '15px 30px', borderRadius: '10px', border: 'none', backgroundColor: '#03dac6', color: 'black', fontWeight: 'bold' }}>Entra</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '15px', background: '#6200ee', color: 'white' }}>Chat con Assistenza</div>
      <div style={{ flexGrow: 1, padding: '15px', overflowY: 'auto', background: '#f5f5f5' }}>
        {chatHistory.map(m => (
          <div key={m.id} style={{ textAlign: m.sender === 'client' ? 'right' : 'left', marginBottom: '10px' }}>
            <span style={{ display: 'inline-block', padding: '10px', borderRadius: '10px', background: m.sender === 'client' ? '#6200ee' : '#e0e0e0', color: m.sender === 'client' ? 'white' : 'black' }}>
              {m.content}
            </span>
          </div>
        ))}
      </div>
      <div style={{ padding: '15px', display: 'flex', gap: '10px', background: 'white' }}>
        <input value={message} onChange={(e) => setMessage(e.target.value)} style={{ flexGrow: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
        <button onClick={inviaMessaggio} style={{ padding: '10px', background: '#6200ee', color: 'white', border: 'none', borderRadius: '5px' }}>Invia</button>
      </div>
    </div>
  );
}

export default ChatCliente;
