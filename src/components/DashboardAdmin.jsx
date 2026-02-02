import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    fetchChats();
    const ch = supabase.channel('adm-upd').on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()).subscribe();
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
    const { data, error } = await supabase.storage.from('video-bucket').upload(`${selectedChat.id}/${fileName}`, file);
    
    if (error) { 
      console.error(error);
      alert("Errore caricamento storage"); 
      setUploading(false); 
      return; 
    }
    
    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
  };

  const styles = {
    container: { display: 'flex', height: '100dvh', backgroundColor: '#1a0033', color: '#ffd700' },
    sidebar: { width: '300px', borderRight: '1px solid #4a148c', background: '#2a004f', overflowY: 'auto' },
    chatArea: { flex: 1, display: 'flex', flexDirection: 'column' },
    inputBar: { padding: '15px', background: '#2a004f', display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid #ffd700' },
    bubble: (isAdmin) => ({
      padding: '10px', borderRadius: '12px', marginBottom: '10px', maxWidth: '70%', border: '1px solid #ffd700',
      background: isAdmin ? '#4a148c' : '#330066', alignSelf: isAdmin ? 'flex-end' : 'flex-start'
    })
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h3 style={{padding:'20px'}}>CHATS</h3>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{padding:'15px', cursor:'pointer', borderBottom:'1px solid #4a148c', background: selectedChat?.id === c.id ? '#4a148c' : 'transparent'}}>
            {c.client_name}
          </div>
        ))}
      </div>
      <div style={styles.chatArea}>
        {selectedChat ? (
          <>
            <div style={{padding:'15px', borderBottom:'1px solid #ffd700'}}>{selectedChat.client_name}</div>
            <div style={{flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column'}}>
              {messages.map(m => (
                <div key={m.id} style={styles.bubble(m.sender === 'admin')}>
                  {m.type === 'video' ? <video src={m.content} controls style={{width:'100%', borderRadius:'8px'}} /> : m.content}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={styles.inputBar}>
              <input type="file" accept="video/*" ref={fileRef} style={{display:'none'}} onChange={uploadVideo} />
              <button onClick={() => fileRef.current.click()} style={{background:'none', border:'1px solid #ffd700', color:'#ffd700', borderRadius:'50%', width:'40px', height:'40px', cursor:'pointer'}}>
                {uploading ? '...' : '🎥'}
              </button>
              <input style={{flex:1, padding:'10px', borderRadius:'20px', border:'none'}} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi..." />
              <button onClick={send} style={{background:'#ffd700', padding:'10px 20px', borderRadius:'20px', fontWeight:'bold', border:'none', cursor:'pointer'}}>INVIA</button>
            </div>
          </>
        ) : <div style={{margin:'auto'}}>Seleziona una chat</div>}
      </div>
    </div>
  );
}
