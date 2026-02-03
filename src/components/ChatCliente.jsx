import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg'; 

export default function ChatCliente() {
  const [nome, setNome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [downloadingId, setDownloadingId] = useState(null); // Stato per il caricamento download
  const scrollRef = useRef();

  const bgImage = "https://images.unsplash.com/photo-1514897575457-c4db467cf78e?auto=format&fit=crop&q=80&w=2000";
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

    const sub = supabase.channel(`chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) => setMessages(prev => [...prev, p.new]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        setMessages(prev => prev.filter(m => m.id !== p.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // FUNZIONE PER IL DOWNLOAD DIRETTO FORZATO
  const forceDownload = async (url, id) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Consulto_Anastasia_${id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Errore nel download:", error);
      alert("Errore durante il download del video.");
    }
    setDownloadingId(null);
  };

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
    avatar: { width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #d4af37', objectFit: 'cover' },
    tiktokButton: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '50%', border: '1px solid #d4af37', textDecoration: 'none', transition: '0.3s' },
    downloadBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
      background: '#d4af37', color: '#1a0033', borderRadius: '10px', cursor: 'pointer',
      fontSize: '13px', fontWeight: 'bold', marginTop: '10px', border: 'none', width: '100%'
    }
  };

  if (!chatId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(rgba(20, 0, 40, 0.9), rgba(20, 0, 40, 0.9)), url(${bgImage})`, backgroundSize: 'cover', fontFamily: 'serif' }}>
        <div style={{ background: 'rgba(30, 0, 60, 0.8)', padding: '40px', borderRadius: '30px', border: '1px solid #d4af37', textAlign: 'center', width: '85%', maxWidth: '380px', backdropFilter: 'blur(15px)' }}>
          <img src={fotoCartomante} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid #d4af37', marginBottom: '15px' }} alt="Anastasia" />
          <h2 style={{ color: '#d4af37', fontSize: '24px', marginBottom: '20px' }}>Anastasia</h2>
          <input style={{ padding: '15px', borderRadius: '12px', marginBottom: '15px', width: '100%', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.05)', color: 'white', textAlign: 'center' }} placeholder="Inserisci il tuo nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ background: 'linear-gradient(45deg, #d4af37, #f9e29c)', width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', color: '#1a0033', cursor: 'pointer' }}>INIZIA IL CONSULTO</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f001a', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '12px 20px', background: '#1a0033', display: 'flex', justifyContent: 'space-between', color: '#d4af37', borderBottom: '1px solid #d4af37', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={fotoCartomante} style={styles.avatar} alt="Anastasia" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 'bold' }}>Anastasia</div>
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <img src={tiktokLogo} style={{ width: '18px', height: '18px' }} alt="TikTok" />
                <span style={{ fontSize: '10px', color: '#fff', opacity: 0.8 }}>Seguimi su TikTok</span>
            </a>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundImage: `linear-gradient(rgba(15, 0, 26, 0.95), rgba(15, 0, 26, 0.95)), url(${bgImage})`, backgroundSize: 'cover' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '20px', alignItems: 'flex-end', gap: '8px' }}>
            {m.sender !== 'client' && <img src={fotoCartomante} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #d4af37' }} alt="Anastasia" />}
            <div style={{ 
              padding: '12px 16px', borderRadius: m.sender === 'client' ? '20px 20px 0px 20px' : '20px 20px 20px 0px', 
              background: m.sender === 'client' ? '#3d0066' : 'rgba(212, 175, 55, 0.1)', color: 'white', 
              border: '1px solid #d4af37', maxWidth: '75%', fontSize: '15px'
            }}>
              {m.type === 'video' ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
                  <button 
                    onClick={() => forceDownload(m.content, m.id)}
                    style={styles.downloadBtn}
                    disabled={downloadingId === m.id}
                  >
                    {downloadingId === m.id ? '⏳ PREPARAZIONE...' : '📥 SCARICA VIDEO ORA'}
                  </button>
                </div>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div style={{ padding: '20px', display: 'flex', gap: '10px', background: '#1a0033', borderTop: '1px solid #d4af37' }}>
        <input style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Fai la tua domanda..." />
        <button onClick={send} style={{ background: '#d4af37', border: 'none', width: '50px', height: '50px', borderRadius: '50%', color: '#1a0033', fontWeight: 'bold' }}>➤</button>
      </div>
    </div>
  );
}
