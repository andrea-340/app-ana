import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  // Carica la lista delle chat
  const fetchChats = async () => {
    const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false });
    setChats(data || []);
  };

  useEffect(() => {
    fetchChats();
    const ch = supabase.channel('adm-list').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Carica i messaggi della chat selezionata
  useEffect(() => {
    if (!selectedChat) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', selectedChat.id).order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMsgs();

    const msgCh = supabase.channel(`chat-${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, (p) => setMessages(prev => [...prev, p.new]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
          setMessages(prev => prev.filter(m => m.id !== p.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ELIMINA CHAT INTERA
  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Eliminare definitivamente questa cliente e tutta la cronologia?")) return;
    const { error } = await supabase.from('chats').delete().eq('id', id);
    if (!error) {
      if (selectedChat?.id === id) setSelectedChat(null);
      fetchChats();
    }
  };

  // ELIMINA SINGOLO MESSAGGIO
  const deleteMessage = async (msgId) => {
    if (!confirm("Eliminare questo messaggio per tutti?")) return;
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) alert("Errore nell'eliminazione");
  };

  // INVIO TESTO
  const sendText = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  // CARICAMENTO VIDEO OTTIMIZZATO
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    setUploading(true);
    setUploadProgress(20);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${selectedChat.id}/${fileName}`;

    // Per video grossi, usiamo un upload più "stabile"
    const { data, error } = await supabase.storage
      .from('video-bucket')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Caricamento più veloce senza sovrascrittura
      });

    if (error) {
      alert("Errore caricamento: " + error.message);
      setUploading(false);
      return;
    }

    setUploadProgress(80);
    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    
    await supabase.from('messages').insert([{ 
      chat_id: selectedChat.id, 
      content: urlData.publicUrl, 
      sender: 'admin', 
      type: 'video' 
    }]);

    setUploading(false);
    setUploadProgress(0);
    fileInputRef.current.value = ""; // Reset input
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', fontFamily: 'serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ 
        width: isDesktop ? '350px' : (selectedChat ? '0px' : '100%'),
        display: !isDesktop && selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #d4af37', backgroundColor: '#1a0033'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #d4af37', textAlign: 'center' }}>
          <img src={fotoAnastasia} style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #d4af37', marginBottom: '10px' }} />
          <h2 style={{ color: '#d4af37', margin: 0, fontSize: '20px' }}>Anastasia Admin</h2>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
              padding: '15px 20px', borderBottom: '1px solid rgba(212,175,55,0.2)', cursor: 'pointer', 
              background: selectedChat?.id === c.id ? 'rgba(212,175,55,0.1)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 'bold' }}>{c.client_name}</span>
              <button onClick={(e) => deleteChat(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
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
                <span>Consulto con: <b>{selectedChat.client_name}</b></span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <div key={m.id} 
                     onDoubleClick={() => deleteMessage(m.id)} // DOPPIO CLICK PER ELIMINARE
                     style={{ 
                        alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                        backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f',
                        color: m.sender === 'admin' ? '#1a0033' : '#fff',
                        padding: '10px 15px', borderRadius: '15px', maxWidth: '70%',
                        position: 'relative', cursor: 'pointer'
                     }}>
                  {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} /> : m.content}
                  <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '5px', textAlign: 'right' }}>Elimina con doppio click</div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {uploading && <div style={{ height: '3px', background: '#d4af37', width: `${uploadProgress}%`, transition: '0.3s' }} />}

            <div style={{ padding: '20px', background: '#1a0033', display: 'flex', gap: '10px' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid #d4af37', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>
                {uploading ? '⏳' : '🎥'}
              </button>
              <input 
                style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #d4af37', background: '#0f001a', color: '#fff' }} 
                value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendText()} placeholder="Scrivi alla cliente..." 
              />
              <button onClick={sendText} style={{ background: '#d4af37', padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', opacity: 0.3 }}>Seleziona una chat per iniziare il consulto</div>
        )}
      </div>
    </div>
  );
}
