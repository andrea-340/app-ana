import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nome, setNome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // URL Immagini
  const bgImage = "https://images.unsplash.com/photo-1572916039941-396f423f7390?auto=format&fit=crop&q=80&w=2000";
  const fotoCartomante = "https://i.ibb.co/v4m0fXm/cartomante-profile.jpg"; // Sostituisci con la tua foto reale
  const iconaUtente = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

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
    if (confirm("Vuoi chiudere la sessione di lettura?")) {
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

  const styles = {
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: '1px solid #d4af37',
      objectFit: 'cover'
    }
  };

  if (!chatId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(rgba(26, 0, 51, 0.85), rgba(26, 0, 51, 0.95)), url(${bgImage})`, backgroundSize: 'cover', fontFamily: 'serif' }}>
        <div style={{ background: 'rgba(42, 0, 79, 0.7)', padding: '40px', borderRadius: '30px', border: '2px solid #d4af37', textAlign: 'center', width: '85%', maxWidth: '400px', backdropFilter: 'blur(10px)' }}>
          <img src={fotoCartomante} style={{ ...styles.avatar, width: '80px', height: '80px', marginBottom: '15px' }} alt="Cartomante" />
          <h2 style={{ color: '#d4af37', marginBottom: '10px' }}>Inizia il Consulto</h2>
          <input style={{ padding: '15px', borderRadius: '12px', marginBottom: '15px', width: '100%', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.1)', color: 'white' }} placeholder="Il tuo nome..." value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ background: 'linear-gradient(45deg, #d4af37, #f9e29c)', width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', color: '#1a0033', cursor: 'pointer' }}>ENTRA</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f001a', fontFamily: 'sans-serif' }}>
      {/* HEADER CON FOTO PROFILO */}
      <div style={{ padding: '10px 20px', background: 'rgba(26, 0, 51, 0.95)', display: 'flex', justifyContent: 'space-between', color: '#d4af37', borderBottom: '1px solid #d4af37', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={fotoCartomante} style={styles.avatar} alt="Profilo" />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Cartomante Sensitiva</div>
            <div style={{ fontSize: '11px', color: '#00ff00' }}>● Online ora</div>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* CHAT MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', backgroundImage: `linear-gradient(rgba(15, 0, 26, 0.9), rgba(15, 0, 26, 0.9)), url(${bgImage})`, backgroundSize: 'cover' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '20px', gap: '8px' }}>
            
            {m.sender !== 'client' && <img src={fotoCartomante} style={{ ...styles.avatar, width: '32px', height: '32px' }} />}
            
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: m.sender === 'client' ? '18px 18px 2px 18px' : '18px 18px 18px 2px', 
              background: m.sender === 'client' ? '#4a148c' : 'rgba(212, 175, 55, 0.15)', 
              color: 'white', 
              border: '1px solid #d4af37', 
              maxWidth: '70%',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              {m.type === 'video' ? (
                <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>{m.content}</span>
              )}
            </div>

            {m.sender === 'client' && <img src={iconaUtente} style={{ ...styles.avatar, width: '32px', height: '32px', filter: 'grayscale(1)' }} />}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div style={{ padding: '15px', display: 'flex', gap: '10px', background: '#1a0033', paddingBottom: '25px', borderTop: '1px solid #d4af37' }}>
        <input style={{ flex: 1, padding: '12px 20px', borderRadius: '25px', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi alla cartomante..." />
        <button onClick={send} style={{ background: '#d4af37', border: 'none', padding: '0 20px', borderRadius: '25px', fontWeight: 'bold', color: '#1a0033', cursor: 'pointer' }}>INVIA</button>
      </div>
    </div>
  );
}
