import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // Stato per i numerini rossi
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const scrollRef = useRef();
  const fileInputRef = useRef();
  const audioNotify = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // 1. Carica la lista delle chat
  const fetchChats = async () => {
    const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false });
    setChats(data || []);
  };

  useEffect(() => {
    fetchChats();
    
    // Sottoscrizione globale per nuovi messaggi (per notifiche e badge)
    const globalMsgSub = supabase.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new;
        
        // Se il messaggio è di un cliente e NON è della chat che sto guardando
        if (newMessage.sender === 'client' && (!selectedChat || selectedChat.id !== newMessage.chat_id)) {
          // Incrementa il conteggio notifiche
          setUnreadCounts(prev => ({
            ...prev,
            [newMessage.chat_id]: (prev[newMessage.chat_id] || 0) + 1
          }));
          
          // Riproduci suono notifica
          audioNotify.current.play().catch(e => console.log("Audio blocked by browser"));
          
          // Notifica browser (se permessa)
          if (Notification.permission === "granted") {
            new Notification("Nuovo messaggio su Anastasia Chat", { body: newMessage.content });
          }
        }
      })
      .subscribe();

    // Chiedi permesso per notifiche browser
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => supabase.removeChannel(globalMsgSub);
  }, [selectedChat]);

  // 2. Carica i messaggi quando selezioni una chat e azzera le notifiche
  useEffect(() => {
    if (!selectedChat) return;
    
    // Azzera il conteggio per questa chat
    setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', selectedChat.id).order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMsgs();

    const msgCh = supabase.channel(`chat-${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, (p) => {
        setMessages(prev => [...prev, p.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
          setMessages(prev => prev.filter(m => m.id !== p.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ELIMINAZIONE E INVIO (Codice precedente invariato)
  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Eliminare definitivamente questa cliente?")) return;
    await supabase.from('chats').delete().eq('id', id);
    fetchChats();
  };

  const deleteMessage = async (msgId) => {
    if (!confirm("Eliminare questo messaggio?")) return;
    await supabase.from('messages').delete().eq('id', msgId);
  };

  const sendText = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;
    setUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage.from('video-bucket').upload(`${selectedChat.id}/${fileName}`, file);
    if (error) { alert("Errore!"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', fontFamily: 'serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ 
        width: isDesktop ? '350px' : (selectedChat ? '0px' : '100%'),
        display: !isDesktop && selectedChat ? 'none' : 'flex',
        flexDirection: 'column', borderRight: '1px solid #d4af37', backgroundColor: '#1a0033'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #d4af37', textAlign: 'center' }}>
          <img src={fotoAnastasia} style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #d4af37' }} />
          <h2 style={{ color: '#d4af37', margin: '10px 0 0 0', fontSize: '20px' }}>Anastasia Admin</h2>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
              padding: '15px 20px', borderBottom: '1px solid rgba(212,175,55,0.2)', cursor: 'pointer', 
              background: selectedChat?.id === c.id ? 'rgba(212,175,55,0.2)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>{c.client_name}</span>
                {/* BADGE NOTIFICA */}
                {unreadCounts[c.id] > 0 && (
                  <span style={{ 
                    backgroundColor: '#ff4444', color: 'white', borderRadius: '50%', 
                    padding: '2px 8px', fontSize: '12px', fontWeight: 'bold', animation: 'pulse 1.5s infinite' 
                  }}>
                    {unreadCounts[c.id]}
                  </span>
                )}
              </div>
              <button onClick={(e) => deleteChat(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: !isDesktop && !selectedChat ? 'none' : 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px', background: '#1a0033', borderBottom: '1px solid #d4af37', display: 'flex', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!isDesktop && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '20px' }}>←</button>}
                <span>Consulto: <b>{selectedChat.client_name}</b></span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <div key={m.id} onDoubleClick={() => deleteMessage(m.id)} style={{ 
                    alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                    backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f',
                    color: m.sender === 'admin' ? '#1a0033' : '#fff',
                    padding: '10px 15px', borderRadius: '15px', maxWidth: '70%', cursor: 'pointer'
                }}>
                  {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} /> : m.content}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div style={{ padding: '20px', background: '#1a0033', display: 'flex', gap: '10px' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid #d4af37', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>
                {uploading ? '⏳' : '🎥'}
              </button>
              <input style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #d4af37', background: '#0f001a', color: '#fff' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendText()} placeholder="Scrivi..." />
              <button onClick={sendText} style={{ background: '#d4af37', padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <p>Seleziona una chat</p>
            {Object.values(unreadCounts).reduce((a,b) => a+b, 0) > 0 && (
              <p style={{ color: '#d4af37' }}>Hai nuovi messaggi da leggere!</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
