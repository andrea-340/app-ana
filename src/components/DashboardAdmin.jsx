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

  const handleVideo = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;
    setUploading(true);
    const path = `${selectedChat.id}/${Date.now()}_${file.name}`;
    
    // Utilizzo del nome bucket corretto: video-bucket
    const { data, error } = await supabase.storage.from('video-bucket').upload(path, file);
    
    if (error) { 
      alert("Errore caricamento: " + error.message); 
      setUploading(false); 
      return; 
    }
    
    const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#1a0033', color: '#ffd700', fontFamily: 'sans-serif' }}>
      <div style={{ width: '300px', borderRight: '1px solid #4a148c', overflowY: 'auto', background: '#2a004f' }}>
        <h3 style={{ padding: '20px', borderBottom: '1px solid #ffd700' }}>CHATS</h3>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{ padding: '15px', borderBottom: '1px solid #4a148c', cursor: 'pointer', background: selectedChat?.id === c.id ? '#4a148c' : 'transparent' }}>
            {c.client_name}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px', background: '#2a004f', borderBottom: '1px solid #ffd700', fontWeight: 'bold' }}>{selectedChat.client_name}</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender === 'admin' ? 'right' : 'left', marginBottom: '15px' }}>
                  <div style={{ display: 'inline-block', padding: '12px', borderRadius: '15px', background: m.sender === 'admin' ? '#4a148c' : '#330066', color: 'white', border: '1px solid #ffd700', maxWidth: '70%' }}>
                    {m.type === 'video' ? (
                      <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={{ padding: '15px', display: 'flex', gap: '10px', alignItems: 'center', background: '#2a004f' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideo} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid #ffd700', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px' }}>
                {uploading ? '⏳' : '🎥'}
              </button>
              <input style={{ flex: 1, padding: '12px', borderRadius: '25px', border: 'none', fontSize: '16px' }} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi un messaggio..." />
              <button onClick={send} style={{ background: '#ffd700', border: 'none', padding: '12px 20px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', color: '#1a0033' }}>INVIA</button>
            </div>
          </>
        ) : <div style={{ margin: 'auto', opacity: 0.6 }}>Seleziona una cliente per chattare</div>}
      </div>
    </div>
  );
}
