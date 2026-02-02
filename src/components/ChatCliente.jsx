import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nome, setNome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    if (!chatId) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();
    const channel = supabase.channel(`chat-${chatId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const start = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) { setChatId(data.id); localStorage.setItem('chat_token', data.id); }
  };

  const send = async () => {
    if (!input.trim() || !chatId) return;
    const content = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: chatId, content, sender: 'client' }]);
  };

  const s = {
    screen: { height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#1a0033', color: '#ffd700' },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '2px solid #ffd700', textAlign: 'center', fontWeight: 'bold' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '15px' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700', paddingBottom: '40px' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: 'none', backgroundColor: 'white', color: 'black', fontSize: '16px' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' }
  };

  if (!chatId) {
    return (
      <div style={{ ...s.screen, justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: '#2a004f', padding: '30px', borderRadius: '20px', border: '2px solid #ffd700', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Benvenuta</h2>
          <input style={s.input} placeholder="Nome e Cognome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={start} style={{ ...s.btn, width: '100%', marginTop: '20px' }}>ACCEDI ALLA CHAT</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>Chat Privata</div>
      <div style={s.msgArea}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={{ backgroundColor: m.sender === 'client' ? '#4a148c' : '#330066', color: 'white', padding: '10px 15px', borderRadius: '15px', border: '1px solid #ffd700', maxWidth: '85%' }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={s.inputArea}>
        <input style={s.input} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi..." />
        <button style={s.btn} onClick={send}>Invia</button>
      </div>
    </div>
  );
}
