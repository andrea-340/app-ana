import { useState, useEffect, useRef } => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetchChats();
    const channel = supabase.channel('admin-updates').on('postgres_changes', 
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
    const msgChannel = supabase.channel(`chat-${selectedChat.id}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(msgChannel);
  }, [selectedChat]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !selectedChat) return;
    const msgText = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: msgText, sender: 'admin' }]);
  };

  const handleVideoUpload = async (event) => {
    const videoFile = event.target.files[0];
    if (!videoFile || !selectedChat) return;

    setUploading(true);
    const fileExtension = videoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const filePath = `${selectedChat.id}/${fileName}`; // Cartella per chat ID

    const { data, error } = await supabase.storage.from('chat-videos').upload(filePath, videoFile);

    if (error) {
      console.error('Errore upload video:', error);
      alert('Errore durante il caricamento del video.');
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('chat-videos').getPublicUrl(filePath);
    const videoUrl = publicUrlData.publicUrl;

    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: videoUrl, sender: 'admin', type: 'video' }]);
    setUploading(false);
    fileInputRef.current.value = ''; // Resetta il campo file
  };

  const deleteChat = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa chat per sempre?")) return;
    // TODO: Elimina i video associati dal storage prima di eliminare i messaggi e la chat
    await supabase.from('messages').delete().eq('chat_id', id);
    await supabase.from('chats').delete().eq('id', id);
    if (selectedChat?.id === id) setSelectedChat(null);
    fetchChats();
  };

  const styles = {
    container: { display: 'flex', height: '100dvh', width: '100vw', backgroundColor: '#1a0033', color: '#ffd700', overflow: 'hidden' },
    sidebar: { display: isMobile && selectedChat ? 'none' : 'flex', flexDirection: 'column', width: isMobile ? '100%' : '350px', borderRight: '2px solid #4a148c', backgroundColor: '#2a004f' },
    main: { display: isMobile && !selectedChat ? 'none' : 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#1a0033' },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '1px solid #ffd700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700', paddingBottom: isMobile ? '30px' : '15px' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: 'white', color: 'black', fontSize: '16px' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' },
    delBtn: { backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
    videoInputBtn: {
      backgroundColor: '#007bff', // Blu per il video
      color: 'white', border: 'none', padding: '10px 15px', borderRadius: '25px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '1px solid #ffd700' }}>PANNELLO ADMIN</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedChat(c)} style={{ padding: '15px', borderBottom: '1px solid #4a148c', cursor: 'pointer', backgroundColor: selectedChat?.id === c.id ? '#4a148c' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{c.client_name}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} style={styles.delBtn}>ELIMINA</button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.main}>
        {selectedChat ? (
          <>
            <div style={styles.header}>
              {isMobile && <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#ffd700', fontSize: '20px' }}>⬅</button>}
              <span style={{ fontWeight: 'bold' }}>{selectedChat.client_name}</span>
              <button onClick={() => deleteChat(selectedChat.id)} style={styles.delBtn}>ELIMINA CHAT</button>
            </div>
            <div style={styles.msgArea}>
              {messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', marginBottom: '10px', maxWidth: '85%' }}>
                  <div style={{ backgroundColor: m.sender === 'admin' ? '#4a148c' : '#330066', color: 'white', padding: '12px', borderRadius: '15px', border: '1px solid #ffd700' }}>
                    {m.type === 'video' ? (
                      <video controls src={m.content} style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div style={styles.inputArea}>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoUpload} 
                style={{ display: 'none' }} 
                ref={fileInputRef} 
                disabled={uploading}
              />
              <button 
                onClick={() => fileInputRef.current.click()} 
                style={styles.videoInputBtn} 
                disabled={uploading}
              >
                {uploading ? 'Caricamento...' : '🎥 Invia Video'}
              </button>
              <input style={styles.input} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} placeholder="Scrivi un messaggio..." disabled={uploading} />
              <button style={styles.btn} onClick={sendMsg} disabled={uploading}>INVIA</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', opacity: 0.5 }}>Seleziona una chat dalla lista</div>
        )}
      </div>
    </div>
  );
}
