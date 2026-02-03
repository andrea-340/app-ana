import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nome, setNome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // URL di un'immagine di tarocchi per lo sfondo (puoi cambiarla con la tua)
  const bgImage = "https://images.unsplash.com/photo-1572916039941-396f423f7390?auto=format&fit=crop&q=80&w=2000";

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

  // STILI PROFESSIONALI
  const styles = {
    overlay: {
      height: '100dvh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: `linear-gradient(rgba(26, 0, 51, 0.85), rgba(26, 0, 51, 0.95)), url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fontFamily: "'Playfair Display', serif, system-ui",
    },
    card: {
      background: 'rgba(42, 0, 79, 0.6)',
      padding: '40px',
      borderRadius: '30px',
      border: '2px solid #d4af37',
      boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
      textAlign: 'center',
      width: '85%',
      maxWidth: '400px',
      backdropFilter: 'blur(10px)',
    },
    header: {
      padding: '20px',
      background: 'rgba(26, 0, 51, 0.9)',
      display: 'flex',
      justifyContent: 'space-between',
      color: '#d4af37',
      borderBottom: '2px solid #d4af37',
      alignItems: 'center',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
    },
    inputField: {
      padding: '15px',
      borderRadius: '12px',
      marginBottom: '15px',
      width: '100%',
      border: '1px solid #d4af37',
      background: 'rgba(255,255,255,0.05)',
      color: '#fff',
      fontSize: '16px',
      outline: 'none'
    },
    goldButton: {
      background: 'linear-gradient(45deg, #d4af37, #f9e29c)',
      width: '100%',
      padding: '15px',
      borderRadius: '12px',
      fontWeight: 'bold',
      border: 'none',
      color: '#1a0033',
      fontSize: '16px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
    },
    msgClient: {
      background: 'rgba(74, 20, 140, 0.8)',
      color: 'white',
      border: '1px solid #d4af37',
      borderRadius: '18px 18px 2px 18px',
      padding: '12px 18px',
      maxWidth: '85%',
      boxShadow: '2px 2px 10px rgba(0,0,0,0.2)'
    },
    msgCartomante: {
      background: 'rgba(42, 0, 79, 0.9)',
      color: '#f9e29c',
      border: '1px solid #d4af37',
      borderRadius: '18px 18px 18px 2px',
      padding: '12px 18px',
      maxWidth: '85%',
      boxShadow: '2px 2px 10px rgba(0,0,0,0.2)'
    }
  };

  if (!chatId) {
    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={{fontSize: '40px', marginBottom: '10px'}}>✨</div>
          <h2 style={{ marginBottom: '10px', color: '#d4af37', letterSpacing: '2px' }}>IL TUO DESTINO</h2>
          <p style={{ color: '#f9e29c', fontSize: '14px', marginBottom: '25px', fontStyle: 'italic' }}>Rivela ciò che le stelle hanno in serbo per te</p>
          <input 
            style={styles.inputField} 
            placeholder="Il tuo nome..." 
            value={nome} 
            onChange={e => setNome(e.target.value)} 
          />
          <button onClick={startChat} style={styles.goldButton}>INIZIA IL CONSULTO</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f001a', fontFamily: 'system-ui' }}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 8px #00ff00' }}></div>
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Lettura in corso</span>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* MESSAGGI */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px', 
        backgroundImage: `linear-gradient(rgba(15, 0, 26, 0.92), rgba(15, 0, 26, 0.92)), url(${bgImage})`,
        backgroundSize: 'cover'
      }}>
        {messages.map(m => (
          <div key={m.id} style={{ textAlign: m.sender === 'client' ? 'right' : 'left', marginBottom: '20px' }}>
            <div style={m.sender === 'client' ? styles.msgClient : styles.msgCartomante}>
              {m.type === 'video' ? (
                <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{m.content}</span>
              )}
              <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.6, textAlign: 'right' }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div style={{ padding: '20px', background: '#1a0033', borderTop: '1px solid #d4af37', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input 
          style={{ 
            flex: 1, 
            padding: '14px 20px', 
            borderRadius: '30px', 
            border: '1px solid #d4af37', 
            background: 'rgba(255,255,255,0.05)', 
            color: 'white',
            fontSize: '16px',
            outline: 'none'
          }} 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && send()} 
          placeholder="Chiedi alle carte..." 
        />
        <button 
          onClick={send} 
          style={{ 
            background: '#d4af37', 
            border: 'none', 
            width: '45px', 
            height: '45px', 
            borderRadius: '50%', 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#1a0033',
            fontSize: '18px'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
