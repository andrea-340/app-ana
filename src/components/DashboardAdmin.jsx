import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const scrollRef = useRef();

  // Gestione resize per mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchChats();
    // Aggiornamento automatico della lista chat quando un cliente ne crea una nuova
    const channel = supabase.channel('admin-updates').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
    return () => supabase.removeChannel(channel);
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
    
    // Aggiornamento automatico messaggi in tempo reale
    const msgChannel = supabase.channel(`chat-${selectedChat.id}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgChannel);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !selectedChat) return;
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: input, sender: 'admin' }]);
    setInput('');
  };

  const styles = {
    container: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700', overflow: 'hidden' },
    sidebar: { 
      width: isMobile ? (selectedChat ? '0%' : '100%') : '350px', 
      display: isMobile && selectedChat ? 'none' : 'flex',
      flexDirection: 'column', 
      borderRight: '2px solid #4a148c', 
      backgroundColor: '#2a004f' 
    },
    listArea: { flex: 1, overflowY: 'auto' },
    chatItem: (id) => ({
      padding: '20px', borderBottom: '1px solid #4a148c', cursor: 'pointer',
      backgroundColor: selectedChat?.id === id ? '#4a148c' : 'transparent',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }),
    main: { 
      flex: 1, 
      display: isMobile && !selectedChat ? 'none' : 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#1a0033',
      width: '100%'
    },
    header: { padding: '15px', color: '#ffd700', borderBottom: '1px solid #4a148c', display: 'flex', alignItems: 'center', gap: '10px' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '15px', backgroundImage: 'radial-gradient(circle, #2a004f, #1a0033)' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #4a148c' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: '#1a0033', color: 'white', outline: 'none' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' },
    backBtn: { background: 'none', border: 'none', color: '#ffd700', fontSize: '20px', cursor: 'pointer' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ padding: '20px', fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid #4a148c' }}>Admin Panel</div>
        <div style={styles.listArea}>
          {chats.map(c => (
            <div key={c.id} style={styles.chatItem(c.id)} onClick={() => setSelectedChat(c)}>
              <span>{c.client_name}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{new Date(c.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.main}>
        {selectedChat ? (
          <>
            <div style={styles.header}>
              {isMobile && <button style={styles.backBtn} onClick={() => setSelectedChat(null)}>⬅</button>}
              <span>Chat con: <strong>{selectedChat.client_name}</strong></span>
            </div>
            <div style={styles.msgArea}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                  <div style={{ 
                    backgroundColor: m.sender === 'admin' ? '#4a148c' : '#330066', 
                    color: m.sender === 'admin' ? 'white' : '#ffd700',
                    padding: '10px 15px', borderRadius: '15px', border: '1px solid #4a148c', maxWidth: '80%'
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={styles.inputArea}>
              <input 
                style={styles.input} 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && sendMsg()}
                placeholder="Rispondi al cliente..."
              />
              <button style={styles.btn} onClick={sendMsg}>Invia</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5 }}>Seleziona una chat per iniziare</div>
        )}
      </div>
    </div>
  );
}
