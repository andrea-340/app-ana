import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [input, setInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef();
  const fileInputRef = useRef();
  const audioNotify = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    fetchChats();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChats = async () => {
    const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false });
    setChats(data || []);
  };

  useEffect(() => {
    if (!selectedChat) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', selectedChat.id).order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMsgs();

    const msgCh = supabase.channel(`chat-${selectedChat.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMsgs())
      .subscribe();

    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // FUNZIONE CARICAMENTO VELOCE PER VIDEO LUNGHI
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    // Controllo dimensione (opzionale, ma utile per avvisare l'utente)
    if (file.size > 300 * 1024 * 1024) { // 300MB
       if(!confirm("Il video è molto grande, il caricamento potrebbe richiedere qualche minuto. Continua?")) return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    
    // UPLOAD OTTIMIZZATO
    const { data, error } = await supabase.storage
      .from('video-bucket')
      .upload(`${selectedChat.id}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
        // Questo gestisce il progresso in tempo reale
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setUploadProgress(Math.round(percent));
        },
      });

    if (error) {
      console.error("Errore upload:", error);
      alert("Errore durante il caricamento. Riprova con una connessione più stabile.");
    } else {
      const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
      await supabase.from('messages').insert([{ 
        chat_id: selectedChat.id, 
        content: urlData.publicUrl, 
        sender: 'admin', 
        type: 'video' 
      }]);
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const deleteMessage = async (msgId) => {
    if (confirm("Eliminare questo messaggio?")) {
      await supabase.from('messages').delete().eq('id', msgId);
    }
  };

  const sendText = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: isMobile ? (selectedChat ? '0' : '100%') : '350px', display: isMobile && selectedChat ? 'none' : 'flex', flexDirection: 'column', borderRight: '1px solid #d4af37', backgroundColor: '#1a0033' }}>
        <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #d4af37' }}>
           <h2 style={{ color: '#d4af37', fontSize: '18px' }}>Anastasia Admin</h2>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ padding: '15px', borderBottom: '1px solid rgba(212,175,55,0.1)', cursor: 'pointer', background: selectedChat?.id === c.id ? 'rgba(212,175,55,0.2)' : 'transparent' }}>
              {c.client_name}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column' }}>
        {selectedChat && (
          <>
            <div style={{ padding: '15px', background: '#1a0033', borderBottom: '1px solid #d4af37', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '20px' }}>←</button>}
              <span>{selectedChat.client_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <div key={m.id} onDoubleClick={() => deleteMessage(m.id)} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f', color: m.sender === 'admin' ? '#1a0033' : '#fff', padding: '12px', borderRadius: '15px', maxWidth: '85%' }}>
                  {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '8px' }} /> : m.content}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* BARRA DI CARICAMENTO AVANZATA */}
            {isUploading && (
              <div style={{ padding: '10px 20px', background: '#1a0033', borderTop: '1px solid #d4af37' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d4af37', fontSize: '12px', marginBottom: '5px' }}>
                  <span>Invio video in corso...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#0f001a', borderRadius: '5px', overflow: 'hidden', border: '1px solid #d4af37' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #d4af37, #fff)', transition: 'width 0.2s linear' }} />
                </div>
              </div>
            )}

            <div style={{ padding: '15px', background: '#1a0033', display: 'flex', gap: '10px' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button disabled={isUploading} onClick={() => fileInputRef.current.click()} style={{ background: '#3d0066', border: '1px solid #d4af37', borderRadius: '50%', width: '45px', height: '45px', color: '#fff' }}>
                {isUploading ? '⏳' : '🎥'}
              </button>
              <input style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #d4af37', background: '#0f001a', color: '#fff' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendText()} placeholder="Scrivi..." />
              <button onClick={sendText} style={{ background: '#d4af37', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' }}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
