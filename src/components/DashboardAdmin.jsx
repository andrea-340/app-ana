import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    fetchChats();
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
    const msgChannel = supabase.channel(`chat-${selectedChat.id}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgChannel);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt = input, url = null) => {
    if (!txt && !url) return;
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: txt, sender: 'admin', file_url: url }]);
    setInput('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data } = await supabase.storage.from('video-bucket').upload(fileName, file);
    if (data) {
      const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(fileName);
      await send("✨ Visione ricevuta", urlData.publicUrl);
    }
    setUploading(false);
  };

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <h3 style={s.title}>Anime Connesse</h3>
        {chats.map(c => (
          <div key={c.id} style={{...s.chatTab, backgroundColor: selectedChat?.id === c.id ? '#4a148c' : '#2a004f'}}>
            <span onClick={() => setSelectedChat(c)} style={{flex: 1, cursor: 'pointer', color: '#ffd700'}}>{c.client_name}</span>
            <button onClick={async () => { if(confirm("Bandire questa anima?")) await supabase.from('chats').delete().eq('id', c.id); }} style={s.delBtn}>🔮</button>
          </div>
        ))}
      </aside>
      <main style={s.main}>
        {selectedChat ? (
          <>
            <div style={s.header}>In comunione con: {selectedChat.client_name}</div>
            <div style={s.msgArea}>
              {messages.map((m, i) => (
                <div key={i} style={m.sender === 'admin' ? s.myRow : s.theirRow}>
                  <div style={m.sender === 'admin' ? s.myBubble : s.theirBubble}>
                    {m.content}
                    {m.file_url && <video src={m.file_url} controls style={s.video} />}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={s.inputBar}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Scrivi il tuo responso..." style={s.field} />
              <label style={s.uploadIcon}>
                {uploading ? '⏳' : '👁️'}
                <input type="file" accept="video/*" hidden onChange={handleUpload} />
              </label>
              <button onClick={() => send()} style={s.sendBtn}>Invia</button>
            </div>
          </>
        ) : <div style={{margin: 'auto', color: '#ffd700', fontSize: '1.2rem'}}>Scegli un'anima da guidare...</div>}
      </main>
    </div>
  );
}

const s = {
  container: { display: 'flex', height: '100vh', width: '100vw', fontFamily: '"Georgia", serif', backgroundColor: '#1a0033' },
  sidebar: { width: '280px', borderRight: '1px solid #ffd700', backgroundColor: '#2a004f', overflowY: 'auto' },
  title: { padding: '20px', color: '#ffd700', textAlign: 'center', borderBottom: '1px solid #ffd700' },
  chatTab: { display: 'flex', padding: '15px', borderBottom: '1px solid #4a148c', alignItems: 'center' },
  delBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1a0033' },
  header: { padding: '15px', color: '#ffd700', borderBottom: '1px solid #4a148c', textAlign: 'center', fontSize: '1.2rem' },
  msgArea: { flex: 1, overflowY: 'auto', padding: '20px', backgroundImage: 'radial-gradient(circle, #2a004f, #1a0033)' },
  myRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' },
  theirRow: { display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' },
  myBubble: { backgroundColor: '#4a148c', color: 'white', padding: '12px', borderRadius: '15px 15px 0 15px', maxWidth: '75%', border: '1px solid #ffd700' },
  theirBubble: { backgroundColor: '#330066', color: '#ffd700', padding: '12px', borderRadius: '15px 15px 15px 0', maxWidth: '75%', border: '1px solid #4a148c' },
  video: { width: '100%', borderRadius: '10px', marginTop: '10px', boxShadow: '0 0 15px #ffd700' },
  inputBar: { padding: '15px', display: 'flex', gap: '10px', backgroundColor: '#2a004f' },
  field: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: '#1a0033', color: 'white' },
  uploadIcon: { fontSize: '28px', cursor: 'pointer' },
  sendBtn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }
};