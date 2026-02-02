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
    const sub = supabase.channel(`chat-${chatId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(sub);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) {
      setChatId(data.id);
      localStorage.setItem('chat_token', data.id);
    }
  };

  const send = async () => {
    if (!input.trim() || !chatId) return;
    const val = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: chatId, content: val, sender: 'client' }]);
  };

  const s = {
    screen: { height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#1a0033', color: '#ffd700' },
    area: { flex: 1, overflowY: 'auto', padding: '15px' },
    footer: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700', paddingBottom: '35px' },
    in: { flex: 1, padding: '12px', borderRadius: '25px', border: 'none', fontSize: '16px' }
  };

  if (!chatId) {
    return (
      <div style={{ ...s.screen, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#2a004f', padding: '30px', borderRadius: '20px', border: '2px solid #ffd700', width: '90%', maxWidth: '350px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Accesso Privato</h2>
          <input style={{ ...s.in, width: '100%', marginBottom: '20px' }} placeholder="Inserisci il tuo nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ background: '#ffd700', color: '#1a0033', padding: '15px', borderRadius: '25px', width: '100%', fontWeight: 'bold', border: 'none' }}>ACCEDI</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.screen}>
      <div style={{ padding: '15px', textAlign: 'center', background: '#2a004f', borderBottom: '1px solid #ffd700', fontWeight: 'bold' }}>ASSISTENZA LIVE</div>
      <div style={s.area}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.sender === 'client' ? 'flex-end' : 'flex-start', display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={{ backgroundColor: m.sender === 'client' ? '#4a148c' : '#330066', color: 'white', padding: '12px', borderRadius: '15px', border: '1px solid #ffd700', maxWidth: '85%' }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={s.footer}>
        <input style={s.in} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi qui..." />
        <button onClick={send} style={{ background: '#ffd700', color: '#1a0033', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold', border: 'none' }}>INVIA</button>
      </div>
    </div>
  );
}
