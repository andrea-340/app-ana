import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetchChats();
    const ch = supabase.channel('adm-upd').on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()).subscribe();
    return () => { window.removeEventListener('resize', handleResize); supabase.removeChannel(ch); };
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
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !selectedChat) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: val, sender: 'admin', type: 'text' }]);
  };

  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;
    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('chat-videos').upload(`${selectedChat.id}/${fileName}`, file);
    
    if (error) { alert("Errore caricamento"); setUploading(false); return; }
    
    const { data: urlData } = supabase.storage.from('chat-videos').getPublicUrl(data.path);
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
  };

  const deleteChat = async (id) => {
    if (!confirm("Eliminare la chat?")) return;
    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);
    if (selectedChat?.id === id) setSelectedChat(null);
    fetchChats();
  };

  const s = {
    container: { display: 'flex', height: '100dvh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700' },
    side: { display: isMobile && selectedChat ? 'none' : 'flex', flexDirection: 'column', width: isMobile ? '100%' : '300px', borderRight: '1px solid #4a148c', backgroundColor: '#2a004f' },
    main: { display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column', flex: 1 },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footer: { padding: '10px', backgroundColor: '#2a004f', display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid #ffd700', paddingBottom: '30px' },
    input: { flex: 1, padding: '10px', borderRadius: '20px', border: 'none', fontSize: '16px' },
    btnVideo: { background: '#4a148c', border: '1px solid #ffd700', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }
  };

  return (
    <div style={s.container}>
      <div style={s.side}>
        <div style={{padding:'20px', fontWeight:'bold', borderBottom:'1px solid #ffd700'}}>CHATS</div>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{padding:'15px', borderBottom:'1px solid #4a148c', cursor:'pointer', display:'flex', justifyContent:'space-between', backgroundColor: selectedChat?.id === c.id ? '#4a148c' : 'transparent'}}>
            {c.client_name} <button onClick={(e) => {e.stopPropagation(); deleteChat(c.id);}} style={{background:'red', color:'white', border:'none', borderRadius:'4px', fontSize:'10px'}}>X</button>
          </div>
        ))}
      </div>
      <div style={s.main}>
        {selectedChat ? (
          <>
            <div style={s.header}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{background:'none', border:'none', color:'#ffd700'}}>⬅</button>}
              <span>{selectedChat.client_name}</span>
              <button onClick={() => deleteChat(selectedChat.id)} style={{background:'red', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', fontSize:'12px'}}>ELIMINA</button>
            </div>
            <div style={{flex:1, overflowY:'auto', padding:'15px'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender === 'admin' ? 'right' : 'left', marginBottom:'10px'}}>
                  <div style={{display:'inline-block', padding:'10px', borderRadius:'10px', background: m.sender === 'admin' ? '#4a148c' : '#330066', border: '1px solid #ffd700', maxWidth:'80%'}}>
                    {m.type === 'video' ? <video src={m.content} controls style={{width:'100%', borderRadius:'8px'}} /> : m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={s.footer}>
              <input type="file" accept="video/*" ref={fileRef} onChange={uploadVideo} style={{display:'none'}} />
              <button style={s.btnVideo} onClick={() => fileRef.current.click()}>{uploading ? '...' : '🎥'}</button>
              <input style={s.input} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi..." />
              <button onClick={send} style={{background:'#ffd700', border:'none', padding:'10px 15px', borderRadius:'20px', fontWeight:'bold'}}>INVIA</button>
            </div>
          </>
        ) : <div style={{margin:'auto'}}>Seleziona una chat</div>}
      </div>
    </div>
  );
}
