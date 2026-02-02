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
    const checkRes = () => setIsMobile(window.innerWidth < 768);
    checkRes();
    window.addEventListener('resize', checkRes);
    fetchChats();
    const ch = supabase.channel('adm-glob').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
    return () => {
      window.removeEventListener('resize', checkRes);
      supabase.removeChannel(ch);
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

  const send = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin' }]);
  };

  const del = async (id) => {
    if (!confirm("Eliminare definitivamente?")) return;
    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);
    if (selectedChat?.id === id) setSelectedChat(null);
    fetchChats();
  };

  // Stili definiti esternamente per evitare errori vite:esbuild
  const layout = {
    container: { display: 'flex', height: '100dvh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700', overflow: 'hidden' },
    side: { display: isMobile && selectedChat ? 'none' : 'flex', flexDirection: 'column', width: isMobile ? '100%' : '320px', borderRight: '1px solid #4a148c', backgroundColor: '#2a004f' },
    chatArea: { display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#1a0033' },
    header: { padding: '15px', background: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    row: { padding: '12px', borderBottom: '1px solid #4a148c', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' },
    box: { flex: 1, overflowY: 'auto', padding: '15px' },
    footer: { padding: '15px', background: '#2a004f', display: 'flex', gap: '8px', borderTop: '1px solid #ffd700', paddingBottom: '35px' },
    in: { flex: 1, padding: '12px', borderRadius: '20px', border: 'none', fontSize: '16px' },
    btn: { background: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 15px', borderRadius: '20px', fontWeight: 'bold' },
    delBtn: { background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }
  };

  return (
    <div style={layout.container}>
      <div style={layout.side}>
        <div style={{ padding: '20px', fontWeight: 'bold' }}>CLIENTI</div>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={layout.row}>
            <span>{c.client_name}</span>
            <button onClick={(e) => { e.stopPropagation(); del(c.id); }} style={layout.delBtn}>X</button>
          </div>
        ))}
      </div>
      <div style={layout.chatArea}>
        {selectedChat ? (
          <>
            <div style={layout.header}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{color:'#ffd700', background:'none', border:'none'}}>Indietro</button>}
              <span>{selectedChat.client_name}</span>
              <button onClick={() => del(selectedChat.id)} style={layout.delBtn}>ELIMINA CHAT</button>
            </div>
            <div style={layout.box}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender === 'admin' ? 'right' : 'left', marginBottom: '10px' }}>
                  <div style={{ display: 'inline-block', padding: '10px', borderRadius: '12px', background: m.sender === 'admin' ? '#4a148c' : '#330066', border: '1px solid #ffd700', maxWidth: '80%' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={layout.footer}>
              <input style={layout.in} value={input} onChange={e => setInput(e.target.value)} placeholder="Scrivi..." />
              <button style={layout.btn} onClick={send}>Invia</button>
            </div>
          </>
        ) : <div style={{margin:'auto'}}>Seleziona una chat</div>}
      </div>
    </div>
  );
}
