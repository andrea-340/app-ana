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
    const globalSub = supabase.channel('global-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        if (p.new.sender === 'client' && (!selectedChat || selectedChat.id !== p.new.chat_id)) {
          setUnreadCounts(prev => ({ ...prev, [p.new.chat_id]: (prev[p.new.chat_id] || 0) + 1 }));
          audioNotify.current.play().catch(() => {});
        }
      }).subscribe();
    return () => supabase.removeChannel(globalSub);
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;
    setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
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

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (confirm("Eliminare questa chat?")) {
      await supabase.from('chats').delete().eq('id', id);
      setSelectedChat(null);
      fetchChats();
    }
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

  // --- LOGICA VELOCIZZATA E OTTIMIZZATA ---
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Pulizia nome file per evitare errori di caricamento
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${cleanName}`;
    
    // Inizio Upload Diretto con monitoraggio reale
    const { data, error } = await supabase.storage
      .from('video-bucket')
      .upload(`${selectedChat.id}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setUploadProgress(Math.round(percent));
        },
      });

    if (!error) {
      const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
      await supabase.from('messages').insert([{ 
        chat_id: selectedChat.id, 
        content: urlData.publicUrl, 
        sender: 'admin', 
        type: 'video' 
      }]);
    } else {
      // Se l'errore è dovuto alla grandezza, avvisa l'utente
      alert(error.message.includes('Payload too large') 
        ? "Video troppo pesante per Supabase! Aumenta il limite nelle impostazioni dello Storage." 
        : "Errore caricamento!");
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ 
        width: isMobile ? '100%' : '350px',
        display: isMobile && selectedChat ? 'none' : 'flex',
        flexDirection: 'column', borderRight: '1px solid #d4af37', backgroundColor: '#1a0033'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #d4af37', textAlign: 'center' }}>
          <img src={fotoAnastasia} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #d4af37' }} />
          <h2 style={{ color: '#d4af37', fontSize: '18px', margin: '10px 0' }}>Anastasia Admin</h2>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
              padding: '15px 20px', borderBottom: '1px solid rgba(212,175,55,0.1)', cursor: 'pointer', 
              background: selectedChat?.id === c.id ? 'rgba(212,175,55,0.2)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>{c.client_name}</span>
              <button onClick={(e) => deleteChat(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px', background: '#1a0033', borderBottom: '1px solid #d4af37', display: 'flex', alignItems: 'center', gap: '15px' }}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px' }}>←</button>}
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{selectedChat.client_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map(m => (
                <div key={m.id} onDoubleClick={() => deleteMessage(m.id)} style={{ 
                  alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                  backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f',
                  color: m.sender === 'admin' ? '#1a0033' : '#fff',
                  padding: '12px', borderRadius: '15px', maxWidth: '80%'
                }}>
                  {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} /> : m.content}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {isUploading && (
              <div style={{ background: '#1a0033', padding: '10px 20px', borderTop: '1px solid #d4af37' }}>
                <div style={{ color: '#d4af37', fontSize: '12px', marginBottom: '5px' }}>Caricamento super veloce: {uploadProgress}%</div>
                <div style={{ width: '100%', height: '8px', background: '#0f001a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#d4af37', transition: 'width 0.1s linear' }} />
                </div>
              </div>
            )}

            <div style={{ padding: '15px', background: '#1a0033', display: 'flex', gap: '10px' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button disabled={isUploading} onClick={() => fileInputRef.current.click()} style={{ background: isUploading ? '#555' : '#3d0066', border: '1px solid #d4af37', borderRadius: '50%', width: '45px', height: '45px', color: '#fff', cursor: 'pointer' }}>
                {isUploading ? '⌛' : '🎥'}
              </button>
              <input style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #d4af37', background: '#0f001a', color: '#fff' }} 
                     value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendText()} placeholder="Scrivi un messaggio..." />
              <button onClick={sendText} style={{ background: '#d4af37', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#d4af37', opacity: 0.5 }}>
            <p style={{ fontSize: '40px' }}>🔮</p>
            <p>Seleziona una cliente</p>
          </div>
        )}
      </div>
    </div>
  );
}
