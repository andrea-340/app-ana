import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nomeCognome, setNomeCognome] = useState('');
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // Recupera sessione se esiste
  useEffect(() => {
    const saved = localStorage.getItem('chat_token');
    if (saved) setChatId(saved);
  }, []);

  // Sincronizzazione Messaggi
  useEffect(() => {
    if (!chatId) return;
    const fetchMsgs = async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
      if (error || !data) { resetSession(); }
      else { setMessages(data); }
    };
    fetchMsgs();

    const channel = supabase.channel(`chat-${chatId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nomeCognome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nomeCognome }]).select();
    if (data && data[0]) {
      localStorage.setItem('chat_token', data[0].id);
      setChatId(data[0].id);
    }
  };

  const resetSession = () => {
    localStorage.removeItem('chat_token');
    setChatId(null);
    setMessages([]);
    setNomeCognome('');
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await supabase.from('messages').insert([{ chat_id: chatId, content: input, sender: 'client' }]);
    setInput('');
  };

  // 1. SCHERMATA DI INGRESSO (Nome e Cognome)
  if (!chatId) return (
    <div style={st.center}>
      <div style={st.card}>
        <h1 style={st.magicTitle}>✨ Il Portale ✨</h1>
        <p style={{color: '#e0b0ff', marginBottom: '25px'}}>Rivela la tua identità alla Creator</p>
        <form onSubmit={startChat}>
          <input 
            style={st.input} 
            placeholder="Nome e Cognome" 
            value={nomeCognome} 
            onChange={e => setNomeCognome(e.target.value)} 
            required
          />
          <button style={st.btnStart} type="submit">Inizia Conversazione</button>
        </form>
      </div>
    </div>
  );

  // 2. INTERFACCIA CHAT ATTIVA
  return (
    <div style={st.container}>
      <div style={st.head}>
        <span>✨ Chat Diretta ✨</span>
        <button onClick={resetSession} style={st.closeBtn} title="Chiudi connessione">✕</button>
      </div>
      
      <div style={st.msgArea}>
        {messages.map((m, i) => (
          <div key={i} style={m.sender === 'client' ? st.myRow : st.theirRow}>
            <div style={m.sender === 'client' ? st.myBubble : st.theirBubble}>
              {m.content}
              {m.file_url && <video src={m.file_url} controls style={st.video} playsInline />}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={send} style={st.footer}>
        <input style={st.field} value={input} onChange={e => setInput(e.target.value)} placeholder="Scrivi alla Creator..." />
        <button type="submit" style={st.send}>✨</button>
      </form>
    </div>
  );
}

const st = {
  center: { display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0033', fontFamily: '"Georgia", serif' },
  card: { padding: '40px 25px', backgroundColor: '#2a004f', borderRadius: '30px', textAlign: 'center', width: '90%', maxWidth: '380px', border: '2px solid #ffd700', boxShadow: '0 0 30px rgba(255, 215, 0, 0.2)' },
  magicTitle: { color: '#ffd700', fontSize: '2rem', marginBottom: '10px', textShadow: '0 0 10px #ffd700' },
  input: { width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '15px', border: '1px solid #ffd700', backgroundColor: '#1a0033', color: 'white', textAlign: 'center', outline: 'none' },
  btnStart: { width: '100%', padding: '15px', backgroundColor: '#ffd700', color: '#1a0033', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  
  container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a0033', fontFamily: '"Georgia", serif' },
  head: { padding: '15px 20px', backgroundColor: '#2a004f', color: '#ffd700', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ffd700' },
  closeBtn: { background: 'none', border: 'none', color: '#ffd700', fontSize: '26px', cursor: 'pointer', lineHeight: '1' },
  
  msgArea: { flex: 1, overflowY: 'auto', padding: '15px', backgroundImage: 'radial-gradient(circle, #2a004f, #1a0033)' },
  myRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' },
  theirRow: { display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' },
  myBubble: { backgroundColor: '#4a148c', color: 'white', padding: '12px', borderRadius: '15px 15px 0 15px', maxWidth: '80%', border: '1px solid #ffd700' },
  theirBubble: { backgroundColor: '#330066', color: '#ffd700', padding: '12px', borderRadius: '15px 15px 15px 0', maxWidth: '80%', border: '1px solid #4a148c' },
  video: { width: '100%', borderRadius: '12px', marginTop: '8px', boxShadow: '0 0 10px #ffd700' },
  
  footer: { padding: '15px', display: 'flex', gap: '10px', backgroundColor: '#2a004f', borderTop: '1px solid #ffd700' },
  field: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: '#1a0033', color: 'white', outline: 'none' },
  send: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px' }
};