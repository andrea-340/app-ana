import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetchChats();
    const channel = supabase.channel('admin-global').on('postgres_changes', 
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
    const content = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content, sender: 'admin' }]);
  };

  const deleteChat = async (id) => {
    if (!window.confirm("Eliminare questa chat?")) return;
    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);
    if (selectedChat?.id === id) setSelectedChat(null);
    fetchChats();
  };

  const s = {
    container: { display: 'flex', height: '100dvh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700', overflow: 'hidden' },
    sidebar: { display: isMobile && selectedChat ? 'none' : 'flex', flexDirection: 'column', width: isMobile ? '100%' : '350px', borderRight: '2px solid #4a148c', backgroundColor: '#2a004f' },
    main: { display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#1a0033' },
    item: { padding: '15px', borderBottom: '1px solid #4a148c', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700', paddingBottom: '30px' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: 'white', color: 'black', fontSize: '16px' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' },
    del: { backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px' }
  };

  return (
    <div style={s.container}>
      <div style={s.sidebar}>
        <div style={{ padding: '20px', fontWeight: 'bold', borderBottom: '1px solid #ffd700' }}>ADMIN PANEL</div>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{ ...s.item, backgroundColor: selectedChat?.id === c.id ? '#4a148c' : 'transparent' }}>
            <div>{c.client_name}</div>
            <button style={s.del} onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}>ELIMINA</button>
          </div>
        ))}
      </div>
      <div style={s.main}>
        {selectedChat ? (
          <>
            <div style={s.header}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#ffd700', fontSize: '20px' }}>⬅</button>}
              <span>{selectedChat.client_name}</span>
              <button style={s.del} onClick={() => deleteChat(selectedChat.id)}>Elimina Chat</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                  <div style={{ backgroundColor: m.sender === 'admin' ? '#4a148c' : '#330066', color: 'white', padding: '10px 15px', borderRadius: '15px', border: '1px solid #ffd700', maxWidth: '80%' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={s.inputArea}>
              <input style={s.input} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} placeholder="Scrivi..." />
              <button style={s.btn} onClick={sendMsg}>Invia</button>
            </div>
          </>
        ) : <div style={{ margin: 'auto' }}>Seleziona una chat</div>}
      </div>
    </div>
  );
}
