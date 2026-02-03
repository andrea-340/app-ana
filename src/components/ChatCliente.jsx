import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
// 1. Questo import è corretto se la foto è in src/assets/anastasia.jpg
import fotoAnastasia from '../assets/anastasia.jpg'; 

export default function ChatCliente() {
  const [nome, setNome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // RISORSE ESTERNE
  const bgImage = "https://images.unsplash.com/photo-1514897575457-c4db467cf78e?auto=format&fit=crop&q=80&w=2000";
  
  // 2. MODIFICA QUI: Usa direttamente la variabile importata
  const fotoCartomante = fotoAnastasia; 

  const tiktokUrl = "https://www.tiktok.com/@anastasia.lapiubella?_r=1&_t=ZN-93bLbLeYkBa";
  const tiktokLogo = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";

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
    if (confirm("Vuoi terminare questa sessione spirituale?")) {
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
      width: '45px',
      height: '45px',
      borderRadius: '50%',
      border: '2px solid #d4af37',
      objectFit: 'cover',
      boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
    },
    tiktokButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(0,0,0,0.6)',
      padding: '5px 12px',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.2)',
      textDecoration: 'none',
      color: '#fff',
      fontSize: '12px',
      marginTop: '5px'
    }
  };

  if (!chatId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(rgba(20, 0, 40, 0.9), rgba(20, 0, 40, 0.9)), url(${bgImage})`, backgroundSize: 'cover', fontFamily: 'serif' }}>
        <div style={{ background: 'rgba(30, 0, 60, 0.8)', padding: '40px', borderRadius: '30px', border: '1px solid #d4af37', textAlign: 'center', width: '85%', maxWidth: '380px', backdropFilter: 'blur(15px)' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
            <img src={fotoCartomante} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid #d4af37' }} alt="Anastasia" />
            <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '20px', height: '20px', background: '#00ff00', borderRadius: '50%', border: '3px solid #1e003c' }}></div>
          </div>
          <h2 style={{ color: '#d4af37', fontSize: '24px', marginBottom: '5px', letterSpacing: '1px' }}>Anastasia</h2>
          <p style={{ color: '#f9e29c', fontSize: '14px', marginBottom: '20px', fontStyle: 'italic' }}>Cartomante & Sensitiva</p>
          
          <input style={{ padding: '15px', borderRadius: '12px', marginBottom: '15px', width: '100%', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.05)', color: 'white', textAlign: 'center' }} placeholder="Inserisci il tuo nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ background: 'linear-gradient(45deg, #d4af37, #f9e29c)', width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', color: '#1a0033', cursor: 'pointer', marginBottom: '15px' }}>INIZIA IL CONSULTO</button>
          
          <a href={tiktokUrl} target="_blank" rel="noreferrer" style={{ ...styles.tiktokButton, justifyContent: 'center' }}>
            <img src={tiktokLogo} style={{ width: '18px' }} /> Seguimi su TikTok
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f001a', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ padding: '12px 20px', background: '#1a0033', display: 'flex', justifyContent: 'space-between', color: '#d4af37', borderBottom: '1px solid #d4af37', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={fotoCartomante} style={styles.avatar} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Anastasia</div>
            <a href={tiktokUrl} target="_blank" rel="noreferrer" style={{ ...styles.tiktokButton, padding: '2px 8px', fontSize: '10px' }}>
              <img src={tiktokLogo} style={{ width: '12px' }} /> TikTok
            </a>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* CHAT MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundImage: `linear-gradient(rgba(15, 0, 26, 0.95), rgba(15, 0, 26, 0.95)), url(${bgImage})`, backgroundSize: 'cover' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '20px', alignItems: 'flex-end', gap: '8px' }}>
            {m.sender !== 'client' && <img src={fotoCartomante} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #d4af37' }} />}
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: m.sender === 'client' ? '20px 20px 0px 20px' : '20px 20px 20px 0px', 
              background: m.sender === 'client' ? '#3d0066' : 'rgba(212, 175, 55, 0.1)', 
              color: 'white', 
              border: '1px solid #d4af37', 
              maxWidth: '75%',
              fontSize: '15px'
            }}>
              {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} /> : <span>{m.content}</span>}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '20px', display: 'flex', gap: '10px', background: '#1a0033', borderTop: '1px solid #d4af37' }}>
        <input 
          style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && send()} 
          placeholder="Fai la tua domanda..." 
        />
        <button onClick={send} style={{ background: '#d4af37', border: 'none', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', color: '#1a0033', fontWeight: 'bold' }}>➤</button>
      </div>
    </div>
  );
}
