import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import fotoAnastasia from '../assets/anastasia.jpg';

export default function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const scrollRef = useRef();
  const fileInputRef = useRef();
  const audioNotify = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // Rilevamento mobile responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChats = async () => {
    const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false });
    setChats(data || []);
  };

  useEffect(() => {
    fetchChats();
    const globalMsgSub = supabase.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender === 'client' && (!selectedChat || selectedChat.id !== newMessage.chat_id)) {
          setUnreadCounts(prev => ({ ...prev, [newMessage.chat_id]: (prev[newMessage.chat_id] || 0) + 1 }));
          audioNotify.current.play().catch(() => {});
        }
      }).subscribe();
    return () => supabase.removeChannel(globalMsgSub);
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;
    setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', selectedChat.id).order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMsgs();

    const msgCh = supabase.channel(`chat-${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, (p) => {
        setMessages(prev => [...prev, p.new]);
      }).subscribe();
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
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('video-bucket').upload(`${selectedChat.id}/${fileName}`, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('video-bucket').getPublicUrl(data.path);
      await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: urlData.publicUrl, sender: 'admin', type: 'video' }]);
    }
    setUploading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', backgroundColor: '#0f001a', color: '#f1f1f1', overflow: 'hidden' }}>
      
      {/* SIDEBAR: Visibile su desktop SEMPRE, su mobile solo se non c'è una chat selezionata */}
      <div style={{ 
        width: isMobile ? '100%' : '350px',
        display: isMobile && selectedChat ? 'none' : 'flex',
        flexDirection: 'column', 
        borderRight: '1px solid #d4af37', 
        backgroundColor: '#1a0033'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #d4af37', textAlign: 'center' }}>
          <img src={fotoAnastasia} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #d4af37' }} alt="Admin" />
          <h2 style={{ color: '#d4af37', fontSize: '18px', margin: '10px 0 0 0' }}>Gestione Consulti</h2>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ 
              padding: '15px 20px', borderBottom: '1px solid rgba(212,175,55,0.1)', cursor: 'pointer', 
              background: selectedChat?.id === c.id ? 'rgba(212,175,55,0.2)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>{c.client_name}</span>
              {unreadCounts[c.id] > 0 && (
                <span style={{ background: 'red', borderRadius: '50%', padding: '2px 7px', fontSize: '11px' }}>{unreadCounts[c.id]}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT: Visibile su desktop SEMPRE, su mobile solo se c'è una chat selezionata */}
      <div style={{ 
        flex: 1, 
        display: isMobile && !selectedChat ? 'none' : 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '15px', background: '#1a0033', borderBottom: '1px solid #d4af37', display: 'flex', alignItems: 'center', gap: '15px' }}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '24px' }}>←</button>}
              <span style={{ fontWeight: 'bold' }}>{selectedChat.client_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ 
                  alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                  backgroundColor: m.sender === 'admin' ? '#d4af37' : '#2a004f',
                  color: m.sender === 'admin' ? '#1a0033' : '#fff',
                  padding: '10px', borderRadius: '12px', maxWidth: '85%'
                }}>
                  {m.type === 'video' ? <video src={m.content} controls style={{ width: '100%', borderRadius: '8px' }} /> : m.content}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div style={{ padding: '10px', background: '#1a0033', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="file" accept="video/*" ref={fileInputRef} onChange={handleVideoUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} style={{ background: '#3d0066', border: '1px solid #d4af37', borderRadius: '50%', width: '45px', height: '45px', color: '#fff' }}>
                {uploading ? '...' : '🎥'}
              </button>
              <input style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #d4af37', background: '#0f001a', color: '#fff' }} 
                     value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendText()} placeholder="Scrivi..." />
              <button onClick={sendText} style={{ background: '#d4af37', border: 'none', padding: '10px 15px', borderRadius: '20px', fontWeight: 'bold' }}>➤</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', color: '#d4af37' }}>Seleziona una cliente per iniziare</div>
        )}
      </div>
    </div>
  );
}
