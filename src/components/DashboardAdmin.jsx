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
    const ch = supabase.channel('adm-list').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chats' }, () => fetchChats()
    ).subscribe();
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
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, 
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgCh);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const deleteChat = async (e, id) => {
    e.stopPropagation(); // Impedisce di aprire la chat mentre la elimini
    if (!confirm("Vuoi davvero eliminare questa chat e tutti i suoi messaggi?")) return;
    const { error } = await supabase.from('chats').delete().eq('id', id);
    if (error) alert("Errore eliminazione");
    else {
      if (selectedChat?.id === id) setSelectedChat(null);
      fetchChats();
    }
  };

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

  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#1a0033', color: '#ffd700', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR: Lista Chat */}
      <div style={{ 
        width: isDesktop ? '350px' : (selectedChat ? '0px' : '100%'),
        display: !isDesktop && selectedChat ? 'none' : 'block',
        borderRight: '1px solid #4a148c', backgroundColor: '#2a004f', overflowY: 'auto' 
      }}>
        <h2 style={{ padding: '20px', borderBottom: '1px solid #ffd700', margin: 0 }}>ADMIN PANEL</h2>
        {chats.map(c => (
          <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
            padding: '15px 20px', borderBottom: '1px solid #4a148c', cursor: 'pointer', 
            background: selectedChat?.id === c.id ? '#4a148c' : 'transparent',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>{c.client_name}</span>
            <button onClick={(e) => deleteChat(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
          </div>
        ))}
      </div>

      {/* AREA CHAT */}
      <div style={{ 
        flex: 1, 
        display: !isDesktop && !selectedChat ? 'none' : 'flex', 
        flexDirection: 'column' 
      }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px', background: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#ffd700', fontSize: '24px', cursor: 'pointer' }}>←</button>
              <span style={{ fontWeight: 'bold' }}>{selectedChat.client_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {messages.map(m => (
                <div key={m.id} style={{ 
                  alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                  backgroundColor: m.sender === 'admin' ? '#4a148c' : '#330066',
                  color: 'white', padding: '12px', borderRadius: '15px', marginBottom: '10px',
                  maxWidth: '80%', border: '1px solid #ffd700'
                }}>
                  {m.type === 'video' ? (
                    <video src={m.content} controls style={{ width: '100%', borderRadius: '10px' }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  )}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div style={{ padding: '15px', background: '#2a004f', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid #ffd700', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>
                {uploading ? '⏳' : '🎥'}
              </button>
              <input 
                style={{ flex: 1, padding: '12px', borderRadius: '25px', border: 'none', outline: 'none' }} 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && sendText()} 
                placeholder="Rispondi..." 
              />
              <button onClick={sendText} style={{ background: '#ffd700', padding: '10px 20px', borderRadius: '25px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#1a0033' }}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', opacity: 0.5, textAlign: 'center' }}>
            <h2>Seleziona una cliente dalla lista</h2>
          </div>
        )}
      </div>
    </div>
  );
}
