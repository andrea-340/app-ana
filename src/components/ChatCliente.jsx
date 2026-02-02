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
    const sub = supabase.channel(`chat-${chatId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) => setMessages(prev => [...prev, p.new])).subscribe();
    return () => supabase.removeChannel(sub);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async () => {
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) { setChatId(data.id); localStorage.setItem('chat_token', data.id); }
  };

  const logout = () => {
    if (confirm("Vuoi chiudere la chat e tornare alla schermata iniziale?")) {
      localStorage.removeItem('chat_token');
      setChatId(null);
      setMessages([]);
      setNome('');
    }
  };

  const send = async () => {
    if (!input.trim() || !chatId) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: chatId, content: val, sender: 'client', type: 'text' }]);
  };

  if (!chatId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a0033', color: '#ffd700', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#2a004f', padding: '40px', borderRadius: '20px', border: '1px solid #ffd700', textAlign: 'center', width: '85%', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '20px' }}>Benvenuta</h2>
          <input style={{ padding: '15px', borderRadius: '10px', marginBottom: '15px', width: '100%', border: 'none', fontSize: '16px' }} placeholder="Inserisci il tuo nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ background: '#ffd700', width: '100%', padding: '15px', borderRadius: '10px', fontWeight: 'bold', border: 'none', color: '#1a0033', fontSize: '16px', cursor: 'pointer' }}>ENTRA NELLA CHAT</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#1a0033', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '15px', background: '#2a004f', display: 'flex', justifyContent: 'space-between', color: '#ffd700', borderBottom: '1px solid #ffd700', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>Chat live</span>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ffd700', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {messages.map(m => (
          <div key={m.id} style={{ textAlign: m.sender === 'client' ? 'right' : 'left', marginBottom: '15px' }}>
            <div style={{ display: 'inline-block', padding: '12px', borderRadius: '15px', background: m.sender === 'client' ? '#4a148c' : '#330066', color: 'white', border: '1px solid #ffd700', maxWidth: '80%' }}>
              {m.type === 'video' ? (
                <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={{ padding: '15px', display: 'flex', gap: '10px', background: '#2a004f', paddingBottom: '30px' }}>
        <input style={{ flex: 1, padding: '12px', borderRadius: '25px', border: 'none', fontSize: '16px' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi qui..." />
        <button onClick={send} style={{ background: '#ffd700', border: 'none', padding: '12px 20px', borderRadius: '25px', fontWeight: 'bold', color: '#1a0033' }}>INVIA</button>
      </div>
    </div>
  );
}
