import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  // Caricamento lista chat
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

  // Caricamento messaggi chat selezionata
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

  const sendText = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;
    setUploading(true);
    const path = `${selectedChat.id}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage.from('video-bucket').upload(path, file);
    if (error) { alert("Errore caricamento"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
  };

  // Stili Inline
  const styles = {
    container: { display: 'flex', height: '100dvh', backgroundColor: '#1a0033', color: '#ffd700', fontFamily: 'sans-serif' },
    sidebar: { 
      width: selectedChat ? '0px' : '100%', // Mobile friendly logic
      minWidth: selectedChat ? '0px' : '300px',
      display: selectedChat ? 'none' : 'block', // Nasconde sidebar su mobile se chat aperta
      borderRight: '1px solid #4a148c', backgroundColor: '#2a004f', overflowY: 'auto' 
    },
    sidebarDesktop: { // Forza visualizzazione su schermi grandi
      width: '300px', display: 'block', borderRight: '1px solid #4a148c', backgroundColor: '#2a004f'
    },
    main: { flex: 1, display: selectedChat ? 'flex' : 'none', flexDirection: 'column' },
    mainDesktop: { flex: 1, display: 'flex', flexDirection: 'column' },
    header: { padding: '15px', background: '#2a004f', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #ffd700' },
    backBtn: { background: 'none', border: 'none', color: '#ffd700', fontSize: '24px', cursor: 'pointer' },
    bubble: (isAdmin) => ({
      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
      backgroundColor: isAdmin ? '#4a148c' : '#330066',
      color: 'white', padding: '12px', borderRadius: '15px', marginBottom: '10px',
      maxWidth: '80%', border: '1px solid #ffd700'
    }),
    inputBar: { padding: '15px', background: '#2a004f', display: 'flex', gap: '10px', alignItems: 'center' }
  };

  // Logica per schermi grandi (desktop)
  const isDesktop = window.innerWidth > 768;

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={isDesktop ? styles.sidebarDesktop : styles.sidebar}>
        <h2 style={{ padding: '20px', textAlign: 'center' }}>MIE CHAT</h2>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{ padding: '20px', borderBottom: '1px solid #4a148c', cursor: 'pointer', background: selectedChat?.id === c.id ? '#4a148c' : 'transparent' }}>
            {c.client_name}
          </div>
        ))}
      </div>

      {/* CHAT AREA */}
      <div style={isDesktop ? styles.mainDesktop : styles.main}>
        {selectedChat ? (
          <>
            <div style={styles.header}>
              <button onClick={() => setSelectedChat(null)} style={styles.backBtn}>←</button>
              <span style={{fontWeight:'bold'}}>{selectedChat.client_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {messages.map(m => (
                <div key={m.id} style={styles.bubble(m.sender === 'admin')}>
                  {m.type === 'video' ? (
                    <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
                  ) : (
                    <div style={{whiteSpace: 'pre-wrap'}}>{m.content}</div>
                  )}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div style={styles.inputBar}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid #ffd700', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px' }}>
                {uploading ? '...' : '🎥'}
              </button>
              <input 
                style={{ flex: 1, padding: '12px', borderRadius: '25px', border: 'none' }} 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && sendText()} 
                placeholder="Scrivi..." 
              />
              <button onClick={sendText} style={{ background: '#ffd700', padding: '10px 20px', borderRadius: '25px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5 }}>
            <h2>Seleziona una chat per iniziare</h2>
          </div>
        )}
      </div>
    </div>
  );
}
