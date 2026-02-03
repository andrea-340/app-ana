import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg'; // La tua foto locale

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // Per i video grossi
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    fetchChats();
    const ch = supabase.channel('adm-list').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
    return () => supabase.removeChannel(ch);
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
    const msgCh = supabase.channel(`chat-${selectedChat.id}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, 
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    // Controllo dimensione (opzionale, es. 50MB)
    if (file.size > 52428800) {
      alert("Il video è molto grande, il caricamento potrebbe richiedere tempo.");
    }

    setUploading(true);
    setUploadProgress(10); // Inizio fittizio

    const path = `${selectedChat.id}/${Date.now()}_${file.name}`;
    
    // Upload con monitoraggio
    const { data, error } = await supabase.storage
      .from('video-bucket')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      alert("Errore caricamento");
      setUploading(false);
      return;
    }

    setUploadProgress(90);
    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    
    await supabase.from('messages').insert([{ 
      chat_id: selectedChat.id, 
      content: urlData.publicUrl, 
      sender: 'admin', 
      type: 'video' 
    }]);

    setUploading(false);
    setUploadProgress(0);
  };

  const sendText = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ 
        width: isDesktop ? '380px' : (selectedChat ? '0px' : '100%'),
        display: !isDesktop && selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #3d0066', backgroundColor: '#16002b'
      }}>
        <div style={{ padding: '25px', borderBottom: '1px solid #3d0066', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src={fotoAnastasia} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #d4af37' }} alt="Admin" />
            <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#d4af37' }}>Anastasia</h2>
                <span style={{ fontSize: '12px', color: '#888' }}>Pannello Gestione</span>
            </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
              padding: '20px', borderBottom: '1px solid #2a004f', cursor: 'pointer', 
              background: selectedChat?.id === c.id ? '#2a004f' : 'transparent',
              transition: '0.3s'
            }}>
              <div style={{ fontWeight: 'bold', color: selectedChat?.id === c.id ? '#d4af37' : '#fff' }}>{c.client_name}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>ID: {c.id.substring(0,8)}...</div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT */}
      <div style={{ flex: 1, display: !isDesktop && !selectedChat ? 'none' : 'flex', flexDirection: 'column', backgroundColor: '#0f001a' }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px 25px', background: '#16002b', borderBottom: '1px solid #3d0066', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {!isDesktop && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '20px' }}>←</button>}
                <div style={{ fontWeight: '600' }}>Chat con: <span style={{ color: '#d4af37' }}>{selectedChat.client_name}</span></div>
              </div>
            </div>

            {/* MESSAGGI */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ 
                  alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                  display: 'flex', gap: '10px', flexDirection: m.sender === 'admin' ? 'row-reverse' : 'row',
                  maxWidth: '85%'
                }}>
                  {m.sender === 'admin' && <img src={fotoAnastasia} style={{ width: '30px', height: '30px', borderRadius: '50%' }} />}
                  <div style={{ 
                    backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f',
                    color: m.sender === 'admin' ? '#1a0033' : '#fff',
                    padding: '12px 18px', borderRadius: '18px',
                    fontSize: '14px', lineHeight: '1.5', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {m.type === 'video' ? (
                      <video src={m.content} controls style={{ width: '100%', maxWidth: '300px', borderRadius: '10px' }} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* BARRA CARICAMENTO VIDEO (Visibile solo durante upload) */}
            {uploading && (
                <div style={{ height: '4px', background: '#2a004f', width: '100%' }}>
                    <div style={{ height: '100%', background: '#d4af37', width: `${uploadProgress}%`, transition: 'width 0.5s' }} />
                </div>
            )}

            {/* INPUT */}
            <div style={{ padding: '20px 25px', background: '#16002b', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button 
                disabled={uploading}
                onClick={() => fileInputRef.current.click()} 
                style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid #d4af37', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.3s' }}>
                {uploading ? <span className="loader"></span> : '🎥'}
              </button>
              
              <input 
                style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: '1px solid #3d0066', background: '#0f001a', color: '#fff', outline: 'none' }} 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && sendText()} 
                placeholder="Scrivi un messaggio..." 
              />
              <button onClick={sendText} style={{ background: '#d4af37', color: '#1a0033', padding: '12px 25px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#444' }}>
             <img src={fotoAnastasia} style={{ width: '80px', height: '80px', borderRadius: '50%', filter: 'grayscale(1)', marginBottom: '20px', opacity: 0.3 }} />
             <h3>Seleziona un cliente per iniziare</h3>
          </div>
        )}
      </div>

      <style>{`
        .loader {
            width: 20px;
            height: 20px;
            border: 2px solid #d4af37;
            border-bottom-color: transparent;
            border-radius: 50%;
            display: inline-block;
            animation: rotation 1s linear infinite;
        }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
