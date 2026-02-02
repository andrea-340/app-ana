import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchChats();
    const channel = supabase.channel('global-admin').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
    return () => {
      window.removeEventListener('resize', handleResize);
      supabase.removeChannel(channel);
    };
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
    const sub = supabase.channel(`chat-${selectedChat.id}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(sub);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !selectedChat) return;
    const tempInput = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: tempInput, sender: 'admin' }]);
  };

  const deleteChat = async (id) => {
    if (!window.confirm("Eliminare questa chat permanentemente?")) return;
    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);
    setSelectedChat(null);
    fetchChats();
  };

  const styles = {
    container: { display: 'flex', height: '100dvh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700', overflow: 'hidden' },
    sidebar: { 
      display: isMobile && selectedChat ? 'none' : 'flex', 
      flexDirection: 'column', 
      width: isMobile ? '100%' : '350px', 
      borderRight: '2px solid #4a148c', 
      backgroundColor: '#2a004f' 
    },
    main: { 
      display: isMobile && !selectedChat ? 'none' : 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      backgroundColor: '#1a0033',
      position: 'relative'
    },
    chatItem: (id) => ({
      padding: '20px', borderBottom: '1px solid #4a148c', cursor: 'pointer',
      backgroundColor: selectedChat?.id === id ? '#4a148c' : 'transparent',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }),
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: 'white', color: 'black', fontSize: '16px' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' },
    delBtn: { backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '1px solid #ffd700' }}>PANNELLO ADMIN</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chats.map(c => (
            <div key={c.id} style={styles.chatItem(c.id)} onClick={() => setSelectedChat(c)}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{c.client_name}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(c.created_at).toLocaleTimeString()}</div>
              </div>
              <button style={styles.delBtn} onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}>ELIMINA</button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.main}>
        {selectedChat ? (
          <>
            <div style={styles.header}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#ffd700', fontSize: '20px' }}>⬅</button>}
              <span>{selectedChat.client_name}</span>
              <button style={styles.delBtn} onClick={() => deleteChat(selectedChat.id)}>Elimina Chat</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                  <div style={{ backgroundColor: m.sender === 'admin' ? '#4a148c' : '#330066', color: '
